import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { unitDocuments, units, properties, leases, user } from "~/server/db/schema";
import { eq, and, inArray, desc, or } from "drizzle-orm";
import { hasRole } from "~/lib/roles";
import { isValidUnitDocumentType } from "~/lib/document-constants";

/**
 * Verify the authenticated user has access to the given unit.
 * Landlords: must own the property containing the unit.
 * Tenants: must have an active/notice_given lease on the unit.
 * Returns the DB user or null if unauthorized.
 */
async function verifyUnitAccess(clerkUserId: string, unitId: number) {
  const [currentUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!currentUser) return null;

  const isLandlord = hasRole(currentUser.roles, "landlord");
  const isTenant = hasRole(currentUser.roles, "tenant");

  if (isLandlord) {
    // Landlord must own the property containing this unit
    const [unitData] = await db
      .select({ unitId: units.id })
      .from(units)
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(and(eq(units.id, unitId), eq(properties.userId, clerkUserId)))
      .limit(1);

    if (unitData) return currentUser;
  }

  if (isTenant) {
    // Tenant must have an active-ish lease on this unit
    const [leaseData] = await db
      .select({ leaseId: leases.id })
      .from(leases)
      .where(
        and(
          eq(leases.unitId, unitId),
          eq(leases.tenantId, currentUser.id),
          or(
            eq(leases.status, "active"),
            eq(leases.status, "notice_given"),
            eq(leases.status, "pending_signature")
          )
        )
      )
      .limit(1);

    if (leaseData) return currentUser;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");
    const documentType = searchParams.get("documentType");

    // Determine which units the user can access
    let accessibleUnitIds: number[] = [];
    const isLandlord = hasRole(currentUser.roles, "landlord");
    const isTenant = hasRole(currentUser.roles, "tenant");

    if (isLandlord) {
      const landlordUnits = await db
        .select({ unitId: units.id })
        .from(units)
        .innerJoin(properties, eq(properties.id, units.propertyId))
        .where(eq(properties.userId, clerkUserId));
      accessibleUnitIds = landlordUnits.map((u) => u.unitId);
    }

    if (isTenant) {
      const tenantLeases = await db
        .select({ unitId: leases.unitId })
        .from(leases)
        .where(
          and(
            eq(leases.tenantId, currentUser.id),
            or(
              eq(leases.status, "active"),
              eq(leases.status, "notice_given"),
              eq(leases.status, "pending_signature")
            )
          )
        );
      const tenantUnitIds = tenantLeases.map((l) => l.unitId);
      // Merge with any landlord unit IDs (user could be both)
      accessibleUnitIds = [...new Set([...accessibleUnitIds, ...tenantUnitIds])];
    }

    if (accessibleUnitIds.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    // Filter to specific unit if requested
    if (unitId) {
      const uid = parseInt(unitId);
      if (isNaN(uid) || !accessibleUnitIds.includes(uid)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      accessibleUnitIds = [uid];
    }

    const docs = await db
      .select()
      .from(unitDocuments)
      .where(inArray(unitDocuments.unitId, accessibleUnitIds))
      .orderBy(desc(unitDocuments.uploadedAt));

    const filtered = documentType
      ? docs.filter((d) => d.documentType === documentType)
      : docs;

    return NextResponse.json({ documents: filtered });
  } catch (error) {
    console.error("Error fetching unit documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch unit documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      unitId: number;
      documentType: string;
      fileName: string;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
      notes?: string;
    };

    if (!body.unitId || !body.documentType || !body.fileName || !body.fileUrl) {
      return NextResponse.json(
        { error: "Missing required fields: unitId, documentType, fileName, fileUrl" },
        { status: 400 }
      );
    }

    if (!isValidUnitDocumentType(body.documentType)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    const currentUser = await verifyUnitAccess(clerkUserId, body.unitId);
    if (!currentUser) {
      return NextResponse.json(
        { error: "You do not have access to this unit" },
        { status: 403 }
      );
    }

    const [newDoc] = await db
      .insert(unitDocuments)
      .values({
        unitId: body.unitId,
        uploadedBy: currentUser.id,
        documentType: body.documentType,
        fileName: body.fileName,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize ?? null,
        mimeType: body.mimeType ?? null,
        notes: body.notes?.trim() ? body.notes.trim() : null,
      })
      .returning();

    return NextResponse.json({ document: newDoc }, { status: 201 });
  } catch (error) {
    console.error("Error creating unit document:", error);
    return NextResponse.json(
      { error: "Failed to create unit document" },
      { status: 500 }
    );
  }
}
