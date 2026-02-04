import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { tenancyApplications, units, properties, user } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";

// GET: Fetch user's submitted applications
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's DB ID
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all applications submitted by the user
    const applications = await db
      .select({
        application: tenancyApplications,
        unit: units,
        property: properties,
      })
      .from(tenancyApplications)
      .innerJoin(units, eq(units.id, tenancyApplications.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(tenancyApplications.applicantUserId, currentUser.id))
      .orderBy(desc(tenancyApplications.createdAt));

    const formattedApplications = applications.map((row) => ({
      id: row.application.id,
      status: row.application.status,
      decision: row.application.decision,
      decisionNotes: row.application.decisionNotes,
      submittedAt: row.application.submittedAt,
      reviewedAt: row.application.reviewedAt,
      unit: {
        id: row.unit.id,
        unitNumber: row.unit.unitNumber,
        monthlyRent: row.unit.monthlyRent,
        currency: row.unit.currency,
      },
      property: {
        id: row.property.id,
        name: row.property.name,
        address: row.property.address,
      },
    }));

    return NextResponse.json({ applications: formattedApplications });
  } catch (error) {
    console.error("Error fetching tenant applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
