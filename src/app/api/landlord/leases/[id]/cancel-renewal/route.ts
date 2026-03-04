import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { leases, units, properties, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";

// DELETE: Cancel a pending renewal offer
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leaseId = parseInt(params.id);
    if (isNaN(leaseId)) {
      return NextResponse.json(
        { error: "Invalid lease ID" },
        { status: 400 }
      );
    }

    // Get the pending renewal lease
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

    // Verify landlord owns the property
    if (leaseData.property.userId !== clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate: must be pending_renewal
    if (leaseData.lease.status !== "pending_renewal") {
      return NextResponse.json(
        { error: "Lease is not pending renewal" },
        { status: 400 }
      );
    }

    // Hard delete the pending renewal lease
    await db.delete(leases).where(eq(leases.id, leaseId));

    // Notify tenant
    await createAndEmitNotification({
      userId: leaseData.tenant.id,
      type: "lease_renewal_cancelled",
      title: "Renewal Offer Withdrawn",
      message: `The lease renewal offer for Unit ${leaseData.unit.unitNumber} at ${leaseData.property.name} has been withdrawn by your landlord.`,
      data: JSON.stringify({
        unitId: leaseData.unit.id,
        propertyId: leaseData.property.id,
      }),
      actionUrl: "/dashboard",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling lease renewal:", error);
    return NextResponse.json(
      { error: "Failed to cancel lease renewal" },
      { status: 500 }
    );
  }
}
