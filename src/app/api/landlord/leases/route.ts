import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { leases, units, properties } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

// GET: Fetch leases with optional filters (used by TenantDetailModal for pending renewals)
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    if (!unitId || !tenantId || !status) {
      return NextResponse.json(
        { error: "unitId, tenantId, and status are required" },
        { status: 400 }
      );
    }

    // Verify landlord owns the unit's property
    const [unitData] = await db
      .select({ unit: units, property: properties })
      .from(units)
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(units.id, parseInt(unitId)))
      .limit(1);

    if (!unitData || unitData.property.userId !== clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const results = await db
      .select()
      .from(leases)
      .where(
        and(
          eq(leases.unitId, parseInt(unitId)),
          eq(leases.tenantId, parseInt(tenantId)),
          eq(leases.status, status)
        )
      )
      .limit(1);

    return NextResponse.json({ leases: results });
  } catch (error) {
    console.error("Error fetching leases:", error);
    return NextResponse.json(
      { error: "Failed to fetch leases" },
      { status: 500 }
    );
  }
}
