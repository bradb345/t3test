import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { units, properties } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request, props: { params: Promise<{ id: string; unitId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const propertyId = parseInt(params.id);
    const unitId = parseInt(params.unitId);
    
    // Verify property exists and belongs to user
    const property = await db.query.properties.findFirst({
      where: eq(properties.id, propertyId),
    });

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    if (property.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch the unit to duplicate
    const originalUnit = await db.query.units.findFirst({
      where: and(
        eq(units.id, unitId),
        eq(units.propertyId, propertyId)
      ),
    });

    if (!originalUnit) {
      return new NextResponse("Unit not found", { status: 404 });
    }

    // Create a duplicate unit with empty unitNumber, imageUrls, and floorPlan
    const [duplicatedUnit] = await db
      .insert(units)
      .values({
        propertyId: propertyId,
        unitNumber: "", // Empty unit number as per requirement
        description: originalUnit.description,
        floorPlan: null, // Empty floor plan as per requirement
        squareFeet: originalUnit.squareFeet,
        numBedrooms: originalUnit.numBedrooms,
        numBathrooms: originalUnit.numBathrooms,
        monthlyRent: originalUnit.monthlyRent,
        deposit: originalUnit.deposit,
        currency: originalUnit.currency,
        isAvailable: originalUnit.isAvailable,
        isVisible: false, // Set to hidden by default for new duplicate
        availableFrom: originalUnit.availableFrom,
        features: originalUnit.features,
        imageUrls: JSON.stringify([]), // Empty images as per requirement
      })
      .returning();

    // Update property's totalUnits count
    const unitCount = await db.query.units.findMany({
      where: eq(units.propertyId, propertyId),
    });

    await db
      .update(properties)
      .set({ totalUnits: unitCount.length })
      .where(eq(properties.id, propertyId));

    console.log("Duplicated unit:", duplicatedUnit);
    return NextResponse.json(duplicatedUnit);
  } catch (error) {
    console.error("Error duplicating unit:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
