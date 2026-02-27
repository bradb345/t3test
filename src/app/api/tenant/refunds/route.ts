import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { refunds, leases, units, properties, user } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedTenant } from "~/server/auth";

// GET: List all refunds for the authenticated tenant
export async function GET() {
  try {
    const authResult = await getAuthenticatedTenant();
    if (authResult.error) return authResult.error;
    const tenant = authResult.user;

    const refundsData = await db
      .select({
        refund: refunds,
        lease: leases,
        unit: units,
        property: properties,
        landlord: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
        },
      })
      .from(refunds)
      .innerJoin(leases, eq(leases.id, refunds.leaseId))
      .innerJoin(units, eq(units.id, leases.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(user, eq(user.id, refunds.landlordId))
      .where(eq(refunds.tenantId, tenant.id))
      .orderBy(desc(refunds.createdAt));

    const result = refundsData.map((r) => ({
      ...r.refund,
      lease: r.lease,
      unit: r.unit,
      property: r.property,
      landlord: r.landlord,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching tenant refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}
