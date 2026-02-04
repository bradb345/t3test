import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { units, properties } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { indexUnit, removeUnit, buildUnitSearchRecord } from "~/lib/algolia";
import { deleteFilesFromUploadThing } from "~/lib/uploadthing";

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

export async function GET(req: Request, props: { params: Promise<{ id: string; unitId: string }> }) {
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

export async function PATCH(req: Request, props: { params: Promise<{ id: string; unitId: string }> }) {
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

    // Validate that the unit will have at least one image after this update
    let imageUrlsForValidation: string[] = [];

    if (data.imageUrls !== undefined) {
      // Use incoming imageUrls (may be a JSON string or an array)
      const parsedImageUrls = typeof data.imageUrls === "string"
        ? (JSON.parse(data.imageUrls) as string[])
        : data.imageUrls ?? [];

      if (Array.isArray(parsedImageUrls)) {
        imageUrlsForValidation = parsedImageUrls;
      }
    } else if (existingUnit.imageUrls) {
      // Fall back to existing unit imageUrls when not updated
      try {
        const existing = JSON.parse(existingUnit.imageUrls) as unknown;

        if (Array.isArray(existing)) {
          imageUrlsForValidation = existing as string[];
        }
      } catch (e) {
        console.error("Error parsing existing unit imageUrls:", e);
        imageUrlsForValidation = [];
      }
    }

    if (imageUrlsForValidation.length === 0) {
      return new NextResponse("At least one unit photo is required", { status: 400 });
    }

    // Validate description is required
    const descriptionForValidation = data.description ?? existingUnit.description;

    if (!descriptionForValidation || descriptionForValidation.trim() === "") {
      return new NextResponse("Description is required", { status: 400 });
    }

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

    // Sync with Algolia
    if (updatedUnit) {
      try {
        const searchRecord = buildUnitSearchRecord(updatedUnit, property);
        await indexUnit(searchRecord);
        console.log("Updated unit in Algolia:", updatedUnit.id);
      } catch (algoliaError) {
        // Log but don't fail the request if Algolia sync fails
        console.error("Failed to sync unit with Algolia:", algoliaError);
      }
    }

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

export async function DELETE(req: Request, props: { params: Promise<{ id: string; unitId: string }> }) {
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

    // Get the unit first to retrieve image URLs
    const unit = await db.query.units.findFirst({
      where: and(
        eq(units.id, unitId),
        eq(units.propertyId, propertyId)
      ),
    });

    if (!unit) {
      return new NextResponse("Unit not found", { status: 404 });
    }

    // Delete images from UploadThing if they exist
    if (unit.imageUrls) {
      try {
        const imageUrls = JSON.parse(unit.imageUrls) as string[];
        await deleteFilesFromUploadThing(imageUrls, `unit ${unitId} images`);
      } catch (error) {
        console.error("Error deleting unit images from UploadThing:", error);
        // Continue with unit deletion even if image deletion fails
      }
    }

    // Delete floor plan images from UploadThing if they exist
    if (unit.floorPlan) {
      try {
        const floorPlanUrls = JSON.parse(unit.floorPlan) as string[];
        await deleteFilesFromUploadThing(floorPlanUrls, `unit ${unitId} floor plan`);
      } catch (error) {
        console.error("Error deleting unit floor plan from UploadThing:", error);
        // Continue with unit deletion even if floor plan deletion fails
      }
    }

    // Delete unit
    await db
      .delete(units)
      .where(and(
        eq(units.id, unitId),
        eq(units.propertyId, propertyId)
      ));

    // Remove from Algolia
    try {
      await removeUnit(unitId);
      console.log("Removed unit from Algolia:", unitId);
    } catch (algoliaError) {
      // Log but don't fail the request if Algolia removal fails
      console.error("Failed to remove unit from Algolia:", algoliaError);
    }

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
