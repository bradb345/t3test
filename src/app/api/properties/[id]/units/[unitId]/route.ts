import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { units, properties } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { indexUnit, removeUnit, buildUnitSearchRecord } from "~/lib/algolia";
import { UTApi } from "uploadthing/server";

// Initialize the UploadThing API
const utapi = new UTApi();

/**
 * Extract file key from UploadThing URL
 * URLs can be in formats like:
 * - https://utfs.io/f/{fileKey}
 * - https://{appId}.ufs.sh/f/{fileKey}
 * - https://uploadthing.com/f/{fileKey}
 */
function extractFileKey(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // The file key is typically the last part after /f/
    const fIndex = pathParts.indexOf('f');
    if (fIndex !== -1 && fIndex < pathParts.length - 1) {
      return pathParts[fIndex + 1] ?? null;
    }
    // Fallback: return the last part of the path
    return pathParts[pathParts.length - 1] ?? null;
  } catch {
    // If URL parsing fails, try simple split
    return url.split('/').pop() ?? null;
  }
}

/**
 * Delete files from UploadThing given an array of URLs
 */
async function deleteFilesFromUploadThing(urls: string[], context: string): Promise<void> {
  const fileKeys = urls
    .map(url => extractFileKey(url))
    .filter((key): key is string => key !== null && key.length > 0);
  
  if (fileKeys.length > 0) {
    console.log(`Deleting ${fileKeys.length} files from UploadThing (${context}):`, fileKeys);
    await utapi.deleteFiles(fileKeys);
    console.log(`Successfully deleted files from UploadThing (${context})`);
  }
}

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
