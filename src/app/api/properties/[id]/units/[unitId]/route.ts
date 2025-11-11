import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { units, properties } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

interface UnitData {
  unitNumber?: string;
  description?: string;
  floorPlan?: string | string[];
  squareFeet?: string | number;
  numBedrooms?: string | number;
  numBathrooms?: string | number;
  monthlyRent?: string | number;
  deposit?: string | number;
  isAvailable?: boolean;
  isVisible?: boolean;
  availableFrom?: string;
  features?: string | string[];
  imageUrls?: string | string[];
}

export async function GET(
  req: Request,
  { params }: { params: { id: string; unitId: string } }
) {
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

    // Fetch unit
    const unit = await db.query.units.findFirst({
      where: and(
        eq(units.id, unitId),
        eq(units.propertyId, propertyId)
      ),
    });

    if (!unit) {
      return new NextResponse("Unit not found", { status: 404 });
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; unitId: string } }
) {
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

    // Verify unit exists and belongs to property
    const existingUnit = await db.query.units.findFirst({
      where: and(
        eq(units.id, unitId),
        eq(units.propertyId, propertyId)
      ),
    });

    if (!existingUnit) {
      return new NextResponse("Unit not found", { status: 404 });
    }

    const data = await req.json() as UnitData;
    console.log("Received unit update data:", data);

    // Parse JSON strings if they're already stringified
    const features = data.features ? (typeof data.features === 'string' ? data.features : JSON.stringify(data.features)) : undefined;
    const imageUrls = data.imageUrls ? (typeof data.imageUrls === 'string' ? data.imageUrls : JSON.stringify(data.imageUrls)) : undefined;
    const floorPlan = data.floorPlan ? (typeof data.floorPlan === 'string' ? data.floorPlan : JSON.stringify(data.floorPlan)) : undefined;

    // Update unit in database
    const [updatedUnit] = await db
      .update(units)
      .set({
        unitNumber: data.unitNumber,
        description: data.description,
        floorPlan: floorPlan,
        squareFeet: data.squareFeet ? parseInt(String(data.squareFeet)) : undefined,
        numBedrooms: data.numBedrooms ? parseInt(String(data.numBedrooms)) : undefined,
        numBathrooms: data.numBathrooms ? String(data.numBathrooms) : undefined,
        monthlyRent: data.monthlyRent ? String(data.monthlyRent) : undefined,
        deposit: data.deposit ? String(data.deposit) : undefined,
        isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : undefined,
        isVisible: data.isVisible !== undefined ? Boolean(data.isVisible) : undefined,
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
        features: features,
        imageUrls: imageUrls,
      })
      .where(and(
        eq(units.id, unitId),
        eq(units.propertyId, propertyId)
      ))
      .returning();

    console.log("Updated unit:", updatedUnit);
    return NextResponse.json(updatedUnit);
  } catch (error) {
    console.error("Error updating unit:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; unitId: string } }
) {
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

    // Delete unit
    await db
      .delete(units)
      .where(and(
        eq(units.id, unitId),
        eq(units.propertyId, propertyId)
      ));

    // Update property's totalUnits count
    const unitCount = await db.query.units.findMany({
      where: eq(units.propertyId, propertyId),
    });

    await db
      .update(properties)
      .set({ totalUnits: unitCount.length })
      .where(eq(properties.id, propertyId));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
