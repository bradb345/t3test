import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { properties, units, leases } from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import { removeUnit } from "~/lib/algolia";

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

interface PropertyUpdateBody {
  name?: string;
  address?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  yearBuilt?: number;
  totalUnits?: number;
  propertyType?: string;
  amenities?: string[] | string;
  parkingAvailable?: boolean;
  imageUrls?: string[] | string;
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const propertyId = parseInt(params.id);

    // Get the property first to check ownership and get image URLs
    const [property] = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, propertyId),
          eq(properties.userId, userId)
        )
      );

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // Get all units associated with this property
    const propertyUnits = await db
      .select()
      .from(units)
      .where(eq(units.propertyId, propertyId));

    // Check if any units have active leases
    if (propertyUnits.length > 0) {
      const unitIds = propertyUnits.map(unit => unit.id);
      
      const occupiedUnits = await db
        .select()
        .from(leases)
        .where(
          and(
            eq(leases.status, 'active'),
            inArray(leases.unitId, unitIds)
          )
        );

      if (occupiedUnits.length > 0) {
        return new NextResponse(
          JSON.stringify({ 
            error: "Cannot delete property with occupied units. Please remove all tenants from units before deleting the property.",
            occupiedUnitCount: occupiedUnits.length
          }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }
    }

    // Delete property images from UploadThing if they exist
    if (property.imageUrls) {
      try {
        const imageUrls = JSON.parse(property.imageUrls) as string[];
        await deleteFilesFromUploadThing(imageUrls, `property ${propertyId} images`);
      } catch (error) {
        console.error("Error deleting property images:", error);
        // Continue with property deletion even if image deletion fails
      }
    }

    // Delete all units associated with this property (and their images/floor plans)
    for (const unit of propertyUnits) {
      // Remove unit from Algolia
      try {
        await removeUnit(unit.id);
      } catch (error) {
        console.error(`Error removing unit ${unit.id} from Algolia:`, error);
        // Continue with deletion even if Algolia removal fails
      }

      // Delete unit images from UploadThing
      if (unit.imageUrls) {
        try {
          const unitImageUrls = JSON.parse(unit.imageUrls) as string[];
          await deleteFilesFromUploadThing(unitImageUrls, `unit ${unit.id} images`);
        } catch (error) {
          console.error(`Error deleting images for unit ${unit.id}:`, error);
          // Continue with deletion even if image deletion fails
        }
      }

      // Delete floor plan images from UploadThing
      if (unit.floorPlan) {
        try {
          const floorPlanUrls = JSON.parse(unit.floorPlan) as string[];
          await deleteFilesFromUploadThing(floorPlanUrls, `unit ${unit.id} floor plan`);
        } catch (error) {
          console.error(`Error deleting floor plan for unit ${unit.id}:`, error);
          // Continue with deletion even if floor plan deletion fails
        }
      }
    }

    // Delete all units for this property
    if (propertyUnits.length > 0) {
      await db
        .delete(units)
        .where(eq(units.propertyId, propertyId));
    }

    // Delete the property
    await db
      .delete(properties)
      .where(
        and(
          eq(properties.id, propertyId),
          eq(properties.userId, userId)
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting property:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json() as PropertyUpdateBody;

    // Get the property first to check ownership
    const [existingProperty] = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, parseInt(params.id)),
          eq(properties.userId, userId)
        )
      );

    if (!existingProperty) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // If new images were uploaded and old ones were removed, delete the old ones
    if (body.imageUrls && existingProperty.imageUrls) {
      try {
        const oldUrls = JSON.parse(existingProperty.imageUrls) as string[];
        const newUrls = Array.isArray(body.imageUrls) 
          ? body.imageUrls 
          : JSON.parse(body.imageUrls) as string[];
        
        const removedUrls = oldUrls.filter(url => !newUrls.includes(url));
        
        if (removedUrls.length > 0) {
          const fileKeys = removedUrls.map(url => url.split('/').pop()!);
          await utapi.deleteFiles(fileKeys);
        }
      } catch (error) {
        console.error("Error deleting old images:", error);
        // Continue with property update even if image deletion fails
      }
    }

    // Update the property
    await db
      .update(properties)
      .set({
        name: body.name,
        address: body.address,
        country: body.country,
        latitude: body.latitude !== undefined ? String(body.latitude) : undefined,
        longitude: body.longitude !== undefined ? String(body.longitude) : undefined,
        description: body.description,
        yearBuilt: body.yearBuilt,
        totalUnits: body.totalUnits,
        propertyType: body.propertyType,
        amenities: Array.isArray(body.amenities) ? JSON.stringify(body.amenities) : body.amenities,
        parkingAvailable: body.parkingAvailable,
        imageUrls: Array.isArray(body.imageUrls) ? JSON.stringify(body.imageUrls) : body.imageUrls,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(properties.id, parseInt(params.id)),
          eq(properties.userId, userId)
        )
      );

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error updating property:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
} 