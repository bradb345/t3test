import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import {
  user,
  leases,
  units,
  properties,
  tenantOffboardingNotices,
} from "~/server/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { calculateMoveOutDate } from "~/lib/offboarding";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendEmail } from "~/lib/email";
import { getNoticeGivenEmailHtml, getNoticeGivenEmailSubject } from "~/emails/notice-given";
import { getAuthenticatedUser } from "~/server/auth";
import type { CreateOffboardingRequest } from "~/types/offboarding";

// GET /api/offboarding - List offboarding notices for current user (as tenant or landlord)
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's database ID
    const [dbUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ notices: [] });
    }

    // Get all leases where user is tenant or landlord
    const userLeases = await db
      .select({ id: leases.id })
      .from(leases)
      .where(or(eq(leases.tenantId, dbUser.id), eq(leases.landlordId, dbUser.id)));

    if (userLeases.length === 0) {
      return NextResponse.json({ notices: [] });
    }

    const leaseIds = userLeases.map((l) => l.id);

    // Get offboarding notices for those leases with full details
    const notices = await db
      .select({
        notice: tenantOffboardingNotices,
        lease: leases,
        unit: units,
        property: properties,
      })
      .from(tenantOffboardingNotices)
      .innerJoin(leases, eq(tenantOffboardingNotices.leaseId, leases.id))
      .innerJoin(units, eq(leases.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(inArray(tenantOffboardingNotices.leaseId, leaseIds));

    // Get tenant and landlord details for each notice
    const noticesWithDetails = await Promise.all(
      notices.map(async (n) => {
        const [tenant, landlord, initiatedByUser] = await Promise.all([
          db
            .select()
            .from(user)
            .where(eq(user.id, n.lease.tenantId))
            .limit(1)
            .then((r) => r[0]),
          db
            .select()
            .from(user)
            .where(eq(user.id, n.lease.landlordId))
            .limit(1)
            .then((r) => r[0]),
          db
            .select()
            .from(user)
            .where(eq(user.id, n.notice.initiatedByUserId))
            .limit(1)
            .then((r) => r[0]),
        ]);

        return {
          ...n.notice,
          lease: n.lease,
          unit: n.unit,
          property: n.property,
          tenant,
          landlord,
          initiatedByUser,
        };
      })
    );

    return NextResponse.json({ notices: noticesWithDetails });
  } catch (error) {
    console.error("Error fetching offboarding notices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/offboarding - Create a new offboarding notice
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) return authResult.error;
    const dbUser = authResult.user;

    const body = (await request.json()) as CreateOffboardingRequest;
    const { leaseId, reason } = body;

    if (!leaseId) {
      return NextResponse.json(
        { error: "Lease ID is required" },
        { status: 400 }
      );
    }

    // Get the lease with all details
    const [leaseResult] = await db
      .select({
        lease: leases,
        unit: units,
        property: properties,
      })
      .from(leases)
      .innerJoin(units, eq(leases.unitId, units.id))
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(eq(leases.id, leaseId))
      .limit(1);

    if (!leaseResult) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const { lease, unit, property } = leaseResult;

    // Verify user is tenant or landlord on this lease
    const isTenant = lease.tenantId === dbUser.id;
    const isLandlord = lease.landlordId === dbUser.id;

    if (!isTenant && !isLandlord) {
      return NextResponse.json(
        { error: "You are not authorized to give notice for this lease" },
        { status: 403 }
      );
    }

    // Check lease status
    if (lease.status !== "active") {
      return NextResponse.json(
        { error: "Notice can only be given for active leases" },
        { status: 400 }
      );
    }

    // Check if there's already an active notice for this lease
    const [existingNotice] = await db
      .select()
      .from(tenantOffboardingNotices)
      .where(
        and(
          eq(tenantOffboardingNotices.leaseId, leaseId),
          eq(tenantOffboardingNotices.status, "active")
        )
      )
      .limit(1);

    if (existingNotice) {
      return NextResponse.json(
        { error: "An active notice already exists for this lease" },
        { status: 400 }
      );
    }

    // Calculate dates
    const noticeDate = new Date();
    const moveOutDate = calculateMoveOutDate(noticeDate);
    const initiatedBy = isTenant ? "tenant" : "landlord";

    // Create the offboarding notice
    const [notice] = await db
      .insert(tenantOffboardingNotices)
      .values({
        leaseId,
        initiatedBy,
        initiatedByUserId: dbUser.id,
        noticeDate,
        moveOutDate,
        reason: reason ?? null,
        status: "active",
      })
      .returning();

    if (!notice) {
      return NextResponse.json(
        { error: "Failed to create notice" },
        { status: 500 }
      );
    }

    // Update lease status to notice_given
    await db
      .update(leases)
      .set({ status: "notice_given" })
      .where(eq(leases.id, leaseId));

    // Get tenant and landlord details
    const [tenant, landlord] = await Promise.all([
      db
        .select()
        .from(user)
        .where(eq(user.id, lease.tenantId))
        .limit(1)
        .then((r) => r[0]),
      db
        .select()
        .from(user)
        .where(eq(user.id, lease.landlordId))
        .limit(1)
        .then((r) => r[0]),
    ]);

    if (!tenant || !landlord) {
      return NextResponse.json(
        { notice, message: "Notice created but could not notify other party" }
      );
    }

    // Notify the other party (tenant or landlord)
    const notifyUserId = isTenant ? landlord.id : tenant.id;
    const notifyUserEmail = isTenant ? landlord.email : tenant.email;
    const initiatorName = `${dbUser.first_name} ${dbUser.last_name}`;
    const recipientName = isTenant
      ? `${landlord.first_name} ${landlord.last_name}`
      : `${tenant.first_name} ${tenant.last_name}`;

    // Create in-app notification
    await createAndEmitNotification({
      userId: notifyUserId,
      type: "notice_given",
      title: "Move-Out Notice Received",
      message: `${initiatorName} has given a 2-month notice for Unit ${unit.unitNumber} at ${property.name}. Move-out date: ${moveOutDate.toLocaleDateString()}.`,
      data: JSON.stringify({
        noticeId: notice.id,
        leaseId,
        unitId: unit.id,
        propertyId: property.id,
        initiatedBy,
        moveOutDate: moveOutDate.toISOString(),
      }),
      actionUrl: isTenant
        ? `/landlord-dashboard?tab=tenants`
        : `/dashboard`,
    });

    // Send email notification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const dashboardUrl = isTenant
      ? `${baseUrl}/landlord-dashboard?tab=tenants`
      : `${baseUrl}/dashboard`;

    await sendEmail({
      to: notifyUserEmail,
      subject: getNoticeGivenEmailSubject(unit.unitNumber),
      html: getNoticeGivenEmailHtml({
        recipientName,
        initiatorName,
        initiatedBy,
        unitNumber: unit.unitNumber,
        propertyAddress: property.address,
        noticeDate,
        moveOutDate,
        reason: reason ?? undefined,
        dashboardUrl,
      }),
    });

    return NextResponse.json({
      notice,
      message: "Notice created successfully",
    });
  } catch (error) {
    console.error("Error creating offboarding notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
