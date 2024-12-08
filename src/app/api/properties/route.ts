import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { properties } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await req.json();
    console.log("Received property data:", data);

    // Validate required fields
    if (!data.name || !data.address || !data.propertyType || !data.latitude || !data.longitude) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Create property in database
    const [property] = await db
      .insert(properties)
      .values({
        userId: userId,
        name: data.name,
        address: data.address,
        country: data.country || "US",
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description || "",
        yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt) : null,
        totalUnits: parseInt(data.totalUnits) || 1,
        propertyType: data.propertyType,
        amenities: JSON.stringify(data.amenities || []),
        parkingAvailable: Boolean(data.parkingAvailable),
        imageUrls: Array.isArray(data.imageUrls) ? JSON.stringify(data.imageUrls) : "[]",
      })
      .returning();

    console.log("Created property:", property);
    return NextResponse.json(property);
  } catch (error) {
    console.error("Error creating property:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userProperties = await db.query.properties.findMany({
      where: eq(properties.userId, userId),
    });

    return NextResponse.json(userProperties);
  } catch (error) {
    console.error("Error fetching properties:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
} 