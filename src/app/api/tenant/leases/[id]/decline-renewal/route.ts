import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { leases, units, properties, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";

// PATCH: Tenant declines a renewal offer
export async function PATCH(
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

    // Verify tenant identity
    const [dbUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!dbUser || dbUser.id !== leaseData.lease.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate: must be pending_renewal
    if (leaseData.lease.status !== "pending_renewal") {
      return NextResponse.json(
        { error: "Lease is not pending renewal" },
        { status: 400 }
      );
    }

    // Delete the renewal lease
    await db.delete(leases).where(eq(leases.id, leaseId));

    // Get landlord for notification
    const [landlord] = await db
      .select()
      .from(user)
      .where(eq(user.id, leaseData.lease.landlordId))
      .limit(1);

    // Notify landlord
    if (landlord) {
      await createAndEmitNotification({
        userId: landlord.id,
        type: "lease_renewal_declined",
        title: "Lease Renewal Declined",
        message: `${leaseData.tenant.first_name} ${leaseData.tenant.last_name} has declined the lease renewal for Unit ${leaseData.unit.unitNumber} at ${leaseData.property.name}.`,
        data: JSON.stringify({
          unitId: leaseData.unit.id,
          propertyId: leaseData.property.id,
          tenantId: leaseData.tenant.id,
        }),
        actionUrl: "/my-properties?tab=tenants",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error declining lease renewal:", error);
    return NextResponse.json(
      { error: "Failed to decline lease renewal" },
      { status: 500 }
    );
  }
}
