import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { leases, payments, units, properties, user } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { trackServerEvent } from "~/lib/posthog-events/server";

// PATCH: Confirm lease has been signed externally
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { documentUrl?: string };
    if (!body.documentUrl) {
      return NextResponse.json(
        { error: "Signed lease document is required" },
        { status: 400 }
      );
    }

    const leaseId = parseInt(params.id);
    if (isNaN(leaseId)) {
      return NextResponse.json(
        { error: "Invalid lease ID" },
        { status: 400 }
      );
    }

    // Get the lease with related data
    const [leaseData] = await db
      .select({
        lease: leases,
        unit: units,
        property: properties,
        tenant: user,
      })
      .from(leases)
      .innerJoin(units, eq(units.id, leases.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(user, eq(user.id, leases.tenantId))
      .where(eq(leases.id, leaseId))
      .limit(1);

    if (!leaseData) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      );
    }

    // Verify the current user owns this property
    if (leaseData.property.userId !== clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify lease is in pending_signature status
    if (leaseData.lease.status !== "pending_signature") {
      return NextResponse.json(
        { error: "Lease is not pending signature" },
        { status: 400 }
      );
    }

    // Update lease to active with signed timestamp and document
    const [updatedLease] = await db
      .update(leases)
      .set({
        status: "active",
        leaseSignedAt: new Date(),
        documents: JSON.stringify([body.documentUrl]),
      })
      .where(eq(leases.id, leaseId))
      .returning();

    // Create move-in payment
    if (updatedLease) {
      const rentAmount = parseFloat(leaseData.unit.monthlyRent ?? "0");
      const depositAmount = parseFloat(leaseData.unit.deposit ?? "0");
      const totalAmount = rentAmount + depositAmount;

      if (totalAmount > 0) {
        const [existingMoveIn] = await db
          .select({ id: payments.id })
          .from(payments)
          .where(
            and(
              eq(payments.leaseId, updatedLease.id),
              eq(payments.type, "move_in")
            )
          )
          .limit(1);

        if (!existingMoveIn) {
          await db.insert(payments).values({
            tenantId: leaseData.tenant.id,
            leaseId: updatedLease.id,
            amount: totalAmount.toFixed(2),
            currency: updatedLease.currency,
            type: "move_in",
            status: "pending",
            dueDate: new Date(),
            notes: JSON.stringify({
              rentAmount: rentAmount.toFixed(2),
              securityDeposit: depositAmount.toFixed(2),
            }),
          });
        }
      }
    }

    // Notify tenant that lease is now active
    await createAndEmitNotification({
      userId: leaseData.tenant.id,
      type: "lease_activated",
      title: "Lease Activated",
      message: `Your lease for Unit ${leaseData.unit.unitNumber} at ${leaseData.property.name} has been signed and activated. Please sign in to make your move-in payment.`,
      data: JSON.stringify({
        leaseId,
        unitId: leaseData.unit.id,
        propertyId: leaseData.property.id,
      }),
      actionUrl: "/dashboard?tab=payments",
    });

    void trackServerEvent(clerkUserId, "lease_signing_confirmed", {
      lease_id: leaseId,
      unit_id: leaseData.unit.id,
      property_id: leaseData.property.id,
      tenant_id: leaseData.tenant.id,
      has_document: !!body.documentUrl,
      source: "api",
    });

    return NextResponse.json({
      success: true,
      lease: updatedLease,
    });
  } catch (error) {
    console.error("Error confirming lease signing:", error);
    return NextResponse.json(
      { error: "Failed to confirm lease signing" },
      { status: 500 }
    );
  }
}
