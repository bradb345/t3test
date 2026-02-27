import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { refunds, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedTenant } from "~/server/auth";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendAppEmail } from "~/lib/emails/server";

// POST: Tenant confirms a refund (uses card on file)
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const authResult = await getAuthenticatedTenant();
    if (authResult.error) return authResult.error;
    const tenant = authResult.user;

    const refundId = parseInt(params.id);
    if (isNaN(refundId)) {
      return NextResponse.json({ error: "Invalid refund ID" }, { status: 400 });
    }

    // Fetch the refund
    const [refundData] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.id, refundId))
      .limit(1);

    if (!refundData) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    // Verify this refund belongs to the tenant
    if (refundData.tenantId !== tenant.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check status
    if (refundData.status !== "pending_tenant_action") {
      return NextResponse.json(
        { error: "This refund is no longer pending confirmation" },
        { status: 400 }
      );
    }

    // Check deadline
    if (refundData.tenantActionDeadline && new Date() > refundData.tenantActionDeadline) {
      return NextResponse.json(
        { error: "The confirmation deadline has passed" },
        { status: 400 }
      );
    }

    // For MVP: Mark as processing, then completed
    // In production, this would initiate a Stripe refund/transfer
    const now = new Date();
    const [updated] = await db
      .update(refunds)
      .set({
        status: "completed",
        tenantConfirmedAt: now,
        completedAt: now,
      })
      .where(eq(refunds.id, refundId))
      .returning();

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: refundData.currency,
    }).format(parseFloat(refundData.amount));

    // Notify landlord
    await createAndEmitNotification({
      userId: refundData.landlordId,
      type: "refund_completed",
      title: "Refund Completed",
      message: `${tenant.first_name} ${tenant.last_name} confirmed the refund of ${formattedAmount}. Funds have been processed.`,
      data: JSON.stringify({ refundId }),
      actionUrl: "/my-properties?tab=financials",
    });

    // Notify tenant
    await createAndEmitNotification({
      userId: tenant.id,
      type: "refund_completed",
      title: "Refund Received",
      message: `Your refund of ${formattedAmount} has been processed successfully.`,
      data: JSON.stringify({ refundId }),
      actionUrl: "/dashboard?tab=payments",
    });

    // Send confirmation emails to both parties
    const [landlord] = await db
      .select()
      .from(user)
      .where(eq(user.id, refundData.landlordId))
      .limit(1);

    try {
      await sendAppEmail(tenant.email, "refund_completed", {
        recipientName: `${tenant.first_name} ${tenant.last_name}`,
        amount: refundData.amount,
        currency: refundData.currency,
      });

      if (landlord) {
        await sendAppEmail(landlord.email, "refund_completed", {
          recipientName: `${landlord.first_name} ${landlord.last_name}`,
          amount: refundData.amount,
          currency: refundData.currency,
        });
      }
    } catch (error) {
      console.error("Failed to send refund completion emails:", error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error confirming refund:", error);
    return NextResponse.json(
      { error: "Failed to confirm refund" },
      { status: 500 }
    );
  }
}
