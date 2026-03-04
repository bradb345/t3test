import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { leases, units, properties, user } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendAppEmail } from "~/lib/emails/server";
import { trackServerEvent } from "~/lib/posthog-events/server";

interface EditTermsBody {
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  rentDueDay?: number;
}

// PATCH: Edit lease terms before activation (pending_signature only)
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

    const leaseId = parseInt(params.id);
    if (isNaN(leaseId)) {
      return NextResponse.json(
        { error: "Invalid lease ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as EditTermsBody;

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
        { error: "Lease terms can only be edited before activation" },
        { status: 400 }
      );
    }

    // Validate and build update set
    const updates: Record<string, unknown> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const resolvedStart = body.leaseStart
      ? new Date(body.leaseStart)
      : leaseData.lease.leaseStart;
    const resolvedEnd = body.leaseEnd
      ? new Date(body.leaseEnd)
      : leaseData.lease.leaseEnd;

    if (body.leaseStart !== undefined) {
      const start = new Date(body.leaseStart);
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { error: "Invalid start date" },
          { status: 400 }
        );
      }
      if (start < today) {
        return NextResponse.json(
          { error: "Start date must be today or later" },
          { status: 400 }
        );
      }
      updates.leaseStart = start;
    }

    if (body.leaseEnd !== undefined) {
      const end = new Date(body.leaseEnd);
      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date" },
          { status: 400 }
        );
      }
      if (end <= resolvedStart) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        );
      }
      updates.leaseEnd = end;
    }

    // Also validate cross-date constraint when only start is changing
    if (body.leaseStart !== undefined && body.leaseEnd === undefined) {
      if (resolvedEnd <= resolvedStart) {
        return NextResponse.json(
          { error: "Start date must be before the current end date" },
          { status: 400 }
        );
      }
    }

    if (body.monthlyRent !== undefined) {
      if (typeof body.monthlyRent !== "number" || body.monthlyRent <= 0) {
        return NextResponse.json(
          { error: "Monthly rent must be greater than 0" },
          { status: 400 }
        );
      }
      updates.monthlyRent = body.monthlyRent.toFixed(2);
    }

    if (body.securityDeposit !== undefined) {
      if (typeof body.securityDeposit !== "number" || body.securityDeposit < 0) {
        return NextResponse.json(
          { error: "Security deposit must be 0 or greater" },
          { status: 400 }
        );
      }
      updates.securityDeposit = body.securityDeposit.toFixed(2);
    }

    if (body.rentDueDay !== undefined) {
      if (
        !Number.isInteger(body.rentDueDay) ||
        body.rentDueDay < 1 ||
        body.rentDueDay > 28
      ) {
        return NextResponse.json(
          { error: "Rent due day must be between 1 and 28" },
          { status: 400 }
        );
      }
      updates.rentDueDay = body.rentDueDay;
    }

    // Check if any values actually changed
    const hasChanges = Object.entries(updates).some(([key, value]) => {
      const current = leaseData.lease[key as keyof typeof leaseData.lease];
      if (value instanceof Date && current instanceof Date) {
        return value.getTime() !== current.getTime();
      }
      return String(value) !== String(current);
    });

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, lease: leaseData.lease });
    }

    // Update with status guard for race-condition safety
    const [updatedLease] = await db
      .update(leases)
      .set(updates)
      .where(
        and(eq(leases.id, leaseId), eq(leases.status, "pending_signature"))
      )
      .returning();

    if (!updatedLease) {
      return NextResponse.json(
        { error: "Lease status has changed and can no longer be edited" },
        { status: 409 }
      );
    }

    // Notify tenant only if values actually changed
    if (hasChanges) {
      await createAndEmitNotification({
        userId: leaseData.tenant.id,
        type: "lease_terms_updated",
        title: "Lease Terms Updated",
        message: `The lease terms for Unit ${leaseData.unit.unitNumber} at ${leaseData.property.name} have been updated. Please review the updated terms.`,
        data: JSON.stringify({
          leaseId,
          unitId: leaseData.unit.id,
          propertyId: leaseData.property.id,
        }),
        actionUrl: "/dashboard?tab=leases",
      });

      if (leaseData.tenant.email) {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        await sendAppEmail(leaseData.tenant.email, "lease_terms_updated", {
          tenantName: `${leaseData.tenant.first_name} ${leaseData.tenant.last_name}`,
          unitNumber: leaseData.unit.unitNumber,
          propertyName: leaseData.property.name,
          currency: updatedLease.currency,
          leaseStart: updatedLease.leaseStart,
          leaseEnd: updatedLease.leaseEnd,
          monthlyRent: updatedLease.monthlyRent,
          securityDeposit: updatedLease.securityDeposit ?? undefined,
          rentDueDay: updatedLease.rentDueDay,
          dashboardUrl: `${baseUrl}/dashboard?tab=leases`,
        });
      }
    }

    void trackServerEvent(clerkUserId, "lease_terms_edited", {
      lease_id: leaseId,
      unit_id: leaseData.unit.id,
      property_id: leaseData.property.id,
      tenant_id: leaseData.tenant.id,
      fields_changed: Object.keys(updates),
      source: "api",
    });

    return NextResponse.json({
      success: true,
      lease: updatedLease,
    });
  } catch (error) {
    console.error("Error editing lease terms:", error);
    return NextResponse.json(
      { error: "Failed to edit lease terms" },
      { status: 500 }
    );
  }
}
