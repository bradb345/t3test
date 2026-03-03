import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { leases, units, properties, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { activateRenewalLease } from "~/server/renewal";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendAppEmail } from "~/lib/emails/server";

// PATCH: Tenant acknowledges (accepts) a renewal offer
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

    // Get the pending renewal lease with related data
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

    // Validate: lease must be pending_renewal
    if (leaseData.lease.status !== "pending_renewal") {
      return NextResponse.json(
        { error: "Lease is not pending renewal" },
        { status: 400 }
      );
    }

    if (!leaseData.lease.previousLeaseId) {
      return NextResponse.json(
        { error: "Renewal lease has no linked previous lease" },
        { status: 400 }
      );
    }

    // Activate the renewal
    await activateRenewalLease({
      newLeaseId: leaseData.lease.id,
      oldLeaseId: leaseData.lease.previousLeaseId,
    });

    // Get landlord info for notification
    const [landlord] = await db
      .select()
      .from(user)
      .where(eq(user.id, leaseData.lease.landlordId))
      .limit(1);

    // Notify landlord
    if (landlord) {
      await createAndEmitNotification({
        userId: landlord.id,
        type: "lease_renewal_accepted",
        title: "Lease Renewal Accepted",
        message: `${leaseData.tenant.first_name} ${leaseData.tenant.last_name} has accepted the lease renewal for Unit ${leaseData.unit.unitNumber} at ${leaseData.property.name}.`,
        data: JSON.stringify({
          leaseId: leaseData.lease.id,
          oldLeaseId: leaseData.lease.previousLeaseId,
          unitId: leaseData.unit.id,
          propertyId: leaseData.property.id,
          tenantId: leaseData.tenant.id,
        }),
        actionUrl: "/my-properties?tab=tenants",
      });

      // Send email to landlord
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await sendAppEmail(landlord.email, "lease_renewal_accepted", {
        landlordName: `${landlord.first_name} ${landlord.last_name}`,
        tenantName: `${leaseData.tenant.first_name} ${leaseData.tenant.last_name}`,
        unitNumber: leaseData.unit.unitNumber,
        propertyName: leaseData.property.name,
        newRent: leaseData.lease.monthlyRent,
        currency: leaseData.lease.currency,
        newLeaseStart: leaseData.lease.leaseStart,
        newLeaseEnd: leaseData.lease.leaseEnd,
        dashboardUrl: `${baseUrl}/my-properties?tab=tenants`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error acknowledging lease renewal:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge lease renewal" },
      { status: 500 }
    );
  }
}
