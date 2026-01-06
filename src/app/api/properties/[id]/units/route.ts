import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { units, properties } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { indexUnit, buildUnitSearchRecord } from "~/lib/algolia";

interface UnitData {
  unitNumber: string;
  description?: string;
  floorPlan?: string | string[];
  squareFeet?: string | number;
  numBedrooms: string | number;
  numBathrooms: string | number;
  monthlyRent: string | number;
  deposit?: string | number;
  isAvailable?: boolean;
  isVisible?: boolean;
  availableFrom?: string;
  features?: string | string[];
  imageUrls?: string | string[];
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const propertyId = parseInt(params.id);
    
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

    const data = await req.json() as UnitData;
    console.log("Received unit data:", data);

    // Validate required fields
    if (!data.unitNumber || !data.numBedrooms || !data.numBathrooms || !data.monthlyRent) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Validate required images - at least one unit photo is required
    const parsedImageUrls = typeof data.imageUrls === 'string'
      ? JSON.parse(data.imageUrls) as string[]
      : data.imageUrls ?? [];

    if (!Array.isArray(parsedImageUrls) || parsedImageUrls.length === 0) {
      return new NextResponse("At least one unit photo is required", { status: 400 });
    }

    // Parse JSON strings if they're already stringified
    const features = typeof data.features === 'string' ? data.features : JSON.stringify(data.features ?? []);
    const imageUrls = typeof data.imageUrls === 'string' ? data.imageUrls : JSON.stringify(data.imageUrls ?? []);
    const floorPlan = typeof data.floorPlan === 'string' ? data.floorPlan : JSON.stringify(data.floorPlan ?? []);

    // Inherit currency from the property
    const propertyCurrency = property.currency ?? "USD";

    // Create unit in database
    const [unit] = await db
      .insert(units)
      .values({
        propertyId: propertyId,
        unitNumber: data.unitNumber,
        description: data.description ?? "",
        floorPlan: floorPlan,
        squareFeet: data.squareFeet ? parseInt(String(data.squareFeet)) : null,
        numBedrooms: parseInt(String(data.numBedrooms)),
        numBathrooms: String(data.numBathrooms),
        monthlyRent: String(data.monthlyRent),
        deposit: data.deposit ? String(data.deposit) : null,
        currency: propertyCurrency,
        isAvailable: Boolean(data.isAvailable ?? true),
        isVisible: Boolean(data.isVisible ?? false),
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
        features: features,
        imageUrls: imageUrls,
      })
      .returning();

    // Index in Algolia
    if (unit) {
      try {
        const searchRecord = buildUnitSearchRecord(unit, property);
        await indexUnit(searchRecord);
        console.log("Indexed unit in Algolia:", unit.id);
      } catch (algoliaError) {
        // Log but don't fail the request if Algolia indexing fails
        console.error("Failed to index unit in Algolia:", algoliaError);
      }
    }

    // Update property's totalUnits count
    const unitCount = await db.query.units.findMany({
      where: eq(units.propertyId, propertyId),
    });

    await db
      .update(properties)
      .set({ totalUnits: unitCount.length })
      .where(eq(properties.id, propertyId));

    console.log("Created unit:", unit);
    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error creating unit:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const propertyId = parseInt(params.id);
    
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

    const propertyUnits = await db.query.units.findMany({
      where: eq(units.propertyId, propertyId),
    });

    return NextResponse.json(propertyUnits);
  } catch (error) {
    console.error("Error fetching units:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
