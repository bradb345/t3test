import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { refunds, leases, units, properties } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedLandlord } from "~/server/auth";
import { createAndEmitNotification } from "~/server/notification-emitter";

// PATCH: Cancel a pending refund
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const authResult = await getAuthenticatedLandlord();
    if (authResult.error) return authResult.error;
    const landlord = authResult.user;

    const refundId = parseInt(params.id);
    if (isNaN(refundId)) {
      return NextResponse.json({ error: "Invalid refund ID" }, { status: 400 });
    }

    // Fetch the refund with lease/property info
    const [refundData] = await db
      .select({
        refund: refunds,
        lease: leases,
        unit: units,
        property: properties,
      })
      .from(refunds)
      .innerJoin(leases, eq(leases.id, refunds.leaseId))
      .innerJoin(units, eq(units.id, leases.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(refunds.id, refundId))
      .limit(1);

    if (!refundData) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    // Verify landlord owns this property
    if (refundData.property.userId !== landlord.auth_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only cancel if pending_tenant_action
    if (refundData.refund.status !== "pending_tenant_action") {
      return NextResponse.json(
        { error: "Only pending refunds can be cancelled" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(refunds)
      .set({ status: "cancelled" })
      .where(eq(refunds.id, refundId))
      .returning();

    // Notify tenant
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: refundData.refund.currency,
    }).format(parseFloat(refundData.refund.amount));

    await createAndEmitNotification({
      userId: refundData.refund.tenantId,
      type: "refund_cancelled",
      title: "Refund Cancelled",
      message: `The refund of ${formattedAmount} has been cancelled by your landlord.`,
      data: JSON.stringify({ refundId }),
      actionUrl: "/dashboard?tab=payments",
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error cancelling refund:", error);
    return NextResponse.json(
      { error: "Failed to cancel refund" },
      { status: 500 }
    );
  }
}
