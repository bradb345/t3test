import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import {
  tenancyApplications,
  units,
  properties,
  user,
} from "~/server/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

// GET: Fetch landlord's received applications
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get landlord's properties
    const landlordProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.userId, clerkUserId));

    if (landlordProperties.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    const propertyIds = landlordProperties.map((p) => p.id);

    // Get all units for landlord's properties
    const landlordUnits = await db
      .select({ id: units.id })
      .from(units)
      .where(inArray(units.propertyId, propertyIds));

    if (landlordUnits.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    const unitIds = landlordUnits.map((u) => u.id);

    // Get all applications for landlord's units
    const applications = await db
      .select({
        application: tenancyApplications,
        unit: units,
        property: properties,
        applicant: user,
      })
      .from(tenancyApplications)
      .innerJoin(units, eq(units.id, tenancyApplications.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(user, eq(user.id, tenancyApplications.applicantUserId))
      .where(inArray(tenancyApplications.unitId, unitIds))
      .orderBy(desc(tenancyApplications.createdAt));

    const formattedApplications = applications.map((row) => ({
      id: row.application.id,
      status: row.application.status,
      decision: row.application.decision,
      decisionNotes: row.application.decisionNotes,
      submittedAt: row.application.submittedAt,
      reviewedAt: row.application.reviewedAt,
      paymentSetupComplete: row.application.paymentSetupComplete,
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
      applicant: {
        id: row.applicant.id,
        name: `${row.applicant.first_name} ${row.applicant.last_name}`,
        email: row.applicant.email,
        phone: row.applicant.phone,
        imageUrl: row.applicant.image_url,
      },
    }));

    return NextResponse.json({ applications: formattedApplications });
  } catch (error) {
    console.error("Error fetching landlord applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
