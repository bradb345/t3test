import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { leases, units, properties, user } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendAppEmail } from "~/lib/emails/server";

// POST: Initiate a lease renewal
export async function POST(
  request: NextRequest,
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

    const body = (await request.json()) as {
      leaseStart: string;
      leaseEnd: string;
      monthlyRent: number;
      notes?: string;
    };

    if (!body.leaseStart || !body.leaseEnd || !body.monthlyRent) {
      return NextResponse.json(
        { error: "leaseStart, leaseEnd, and monthlyRent are required" },
        { status: 400 }
      );
    }

    if (body.monthlyRent <= 0) {
      return NextResponse.json(
        { error: "Monthly rent must be greater than 0" },
        { status: 400 }
      );
    }

    const newStart = new Date(body.leaseStart);
    const newEnd = new Date(body.leaseEnd);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }
    if (newEnd <= newStart) {
      return NextResponse.json(
        { error: "Lease end must be after lease start" },
        { status: 400 }
      );
    }

    // Get the current lease with related data
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

    // Verify landlord owns this property
    if (leaseData.property.userId !== clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate: lease must be active
    if (leaseData.lease.status !== "active") {
      return NextResponse.json(
        { error: "Only active leases can be renewed" },
        { status: 400 }
      );
    }

    // Check no existing pending_renewal for this tenant/unit
    const [existingRenewal] = await db
      .select({ id: leases.id })
      .from(leases)
      .where(
        and(
          eq(leases.unitId, leaseData.lease.unitId),
          eq(leases.tenantId, leaseData.lease.tenantId),
          eq(leases.status, "pending_renewal")
        )
      )
      .limit(1);

    if (existingRenewal) {
      return NextResponse.json(
        { error: "A renewal is already pending for this tenant" },
        { status: 400 }
      );
    }

    // Create the new renewal lease
    const [newLease] = await db
      .insert(leases)
      .values({
        unitId: leaseData.lease.unitId,
        tenantId: leaseData.lease.tenantId,
        landlordId: leaseData.lease.landlordId,
        leaseStart: newStart,
        leaseEnd: newEnd,
        monthlyRent: body.monthlyRent.toFixed(2),
        securityDeposit: leaseData.lease.securityDeposit,
        currency: leaseData.lease.currency,
        rentDueDay: leaseData.lease.rentDueDay,
        status: "pending_renewal",
        previousLeaseId: leaseData.lease.id,
        terms: body.notes ? JSON.stringify({ renewalNotes: body.notes }) : leaseData.lease.terms,
      })
      .returning();

    // Notify tenant
    await createAndEmitNotification({
      userId: leaseData.tenant.id,
      type: "lease_renewal_offered",
      title: "Lease Renewal Offered",
      message: `Your landlord has offered a lease renewal for Unit ${leaseData.unit.unitNumber} at ${leaseData.property.name}. Please review the new terms.`,
      data: JSON.stringify({
        leaseId: newLease!.id,
        oldLeaseId: leaseData.lease.id,
        unitId: leaseData.unit.id,
        propertyId: leaseData.property.id,
      }),
      actionUrl: "/dashboard",
    });

    // Get landlord info for email
    const [landlord] = await db
      .select()
      .from(user)
      .where(eq(user.id, leaseData.lease.landlordId))
      .limit(1);
    const landlordName = landlord
      ? `${landlord.first_name ?? ""} ${landlord.last_name ?? ""}`.trim()
      : "";

    // Send email to tenant
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await sendAppEmail(leaseData.tenant.email, "lease_renewal_offered", {
      tenantName: `${leaseData.tenant.first_name} ${leaseData.tenant.last_name}`,
      landlordName,
      unitNumber: leaseData.unit.unitNumber,
      propertyName: leaseData.property.name,
      currentRent: leaseData.lease.monthlyRent,
      newRent: body.monthlyRent.toFixed(2),
      currency: leaseData.lease.currency,
      newLeaseStart: newStart,
      newLeaseEnd: newEnd,
      dashboardUrl: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({
      success: true,
      lease: newLease,
    });
  } catch (error) {
    console.error("Error initiating lease renewal:", error);
    return NextResponse.json(
      { error: "Failed to initiate lease renewal" },
      { status: 500 }
    );
  }
}
