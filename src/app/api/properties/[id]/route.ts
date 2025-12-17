import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { properties, units, leases } from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { removeUnit, buildUnitSearchRecord, indexUnits } from "~/lib/algolia";
import { deleteFilesFromUploadThing } from "~/lib/uploadthing";

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

    // Delete all units associated with this property (and their images/floor plans) in parallel
    await Promise.allSettled(
      propertyUnits.map(async (unit) => {
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
      })
    );

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
          await deleteFilesFromUploadThing(removedUrls, "property image update");
        }
      } catch (error) {
        console.error("Error deleting old images:", error);
        // Continue with property update even if image deletion fails
      }
    }

    // Update the property
    const [updatedProperty] = await db
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
      )
      .returning();

    // Check if property fields that affect unit search records were updated
    const propertyFieldsChanged = 
      body.name !== undefined ||
      body.address !== undefined ||
      body.country !== undefined ||
      body.latitude !== undefined ||
      body.longitude !== undefined ||
      body.propertyType !== undefined;

    // If property fields used in unit search records changed, re-index all units
    if (propertyFieldsChanged && updatedProperty) {
      try {
        // Fetch all units for this property
        const propertyUnits = await db
          .select()
          .from(units)
          .where(eq(units.propertyId, parseInt(params.id)));

        if (propertyUnits.length > 0) {
          // Build search records for all units with updated property data
          const searchRecords = propertyUnits.map(unit => 
            buildUnitSearchRecord(unit, updatedProperty)
          );
          
          // Re-index all units in Algolia
          await indexUnits(searchRecords);
          console.log(`Re-indexed ${propertyUnits.length} units in Algolia after property update`);
        }
      } catch (algoliaError) {
        // Log but don't fail the request if Algolia sync fails
        console.error("Failed to re-index units in Algolia:", algoliaError);
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error updating property:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
} 