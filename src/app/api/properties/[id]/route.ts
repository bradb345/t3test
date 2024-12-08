import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { properties } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { UTApi } from "uploadthing/server";

// Initialize the UploadThing API
const utapi = new UTApi();

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the property first to check ownership and get image URLs
    const [property] = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, parseInt(params.id)),
          eq(properties.userId, userId)
        )
      );

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // Delete images from uploadthing if they exist
    if (property.imageUrls) {
      try {
        const imageUrls = JSON.parse(property.imageUrls as string) as string[];
        // Extract fileKeys from URLs (assuming URLs are in format: https://uploadthing.com/f/fileKey)
        const fileKeys = imageUrls.map(url => url.split('/').pop() as string);
        
        // Delete files from uploadthing if there are any fileKeys
        if (fileKeys.length > 0) {
          await utapi.deleteFiles(fileKeys);
        }
      } catch (error) {
        console.error("Error deleting images:", error);
        // Continue with property deletion even if image deletion fails
      }
    }

    // Delete the property
    await db
      .delete(properties)
      .where(
        and(
          eq(properties.id, parseInt(params.id)),
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

    const body = await req.json();

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
        const oldUrls = JSON.parse(existingProperty.imageUrls as string) as string[];
        const newUrls = Array.isArray(body.imageUrls) 
          ? body.imageUrls 
          : JSON.parse(body.imageUrls as string);
        
        const removedUrls = oldUrls.filter(url => !newUrls.includes(url));
        
        if (removedUrls.length > 0) {
          const fileKeys = removedUrls.map(url => url.split('/').pop() as string);
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
        latitude: body.latitude,
        longitude: body.longitude,
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