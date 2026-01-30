import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import {
  leases,
  units,
  properties,
  tenantOffboardingNotices,
} from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdmin } from "~/lib/roles";
import { completeOffboardingProcess } from "~/server/offboarding";
import { getAuthenticatedUser } from "~/server/auth";
import type { FastTrackOffboardingRequest } from "~/types/offboarding";

// POST /api/admin/fast-track-offboarding - Admin-only immediate offboarding for testing
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) return authResult.error;
    const dbUser = authResult.user;

    // Verify user is an admin
    if (!isAdmin(dbUser)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = (await request.json()) as FastTrackOffboardingRequest;
    const { leaseId } = body;

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

    // Check lease status - allow active or notice_given
    if (lease.status !== "active" && lease.status !== "notice_given") {
      return NextResponse.json(
        { error: "Lease must be active or in notice period" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Check for existing active notice and cancel it
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
      // Cancel the existing notice
      await db
        .update(tenantOffboardingNotices)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelledByUserId: dbUser.id,
          cancellationReason: "Admin fast-track offboarding",
        })
        .where(eq(tenantOffboardingNotices.id, existingNotice.id));
    }

    // Create completed offboarding notice
    const [notice] = await db
      .insert(tenantOffboardingNotices)
      .values({
        leaseId,
        initiatedBy: "landlord",
        initiatedByUserId: dbUser.id,
        noticeDate: now,
        moveOutDate: now, // Immediate
        reason: "Admin fast-track offboarding",
        status: "completed",
        inspectionDate: now,
        inspectionCompleted: true,
        inspectionNotes: "Fast-track: inspection auto-completed",
        depositStatus: "returned",
        depositNotes: "Fast-track: deposit auto-returned",
        completedAt: now,
      })
      .returning();

    // Complete offboarding: terminate lease, update unit, sync Algolia, remove tenant role
    const { tenantRoleRemoved } = await completeOffboardingProcess({
      leaseId,
      unitId: unit.id,
      tenantId: lease.tenantId,
    });

    return NextResponse.json({
      success: true,
      notice,
      message: "Fast-track offboarding completed",
      leaseTerminated: true,
      unitAvailable: true,
      tenantRoleRemoved,
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
      },
      property: {
        id: property.id,
        name: property.name,
      },
    });
  } catch (error) {
    console.error("Error in fast-track offboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
