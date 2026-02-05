import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { properties } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { detectCurrencyFromCoordinates } from "~/lib/currency";
import { addRoleToUserByAuthId } from "~/lib/roles";
import { capturePostHogEvent } from "~/lib/posthog-server";

interface PropertyData {
  name: string;
  address: string;
  propertyType: string;
  latitude: number;
  longitude: number;
  country?: string;
  description?: string;
  yearBuilt?: string;
  totalUnits: string;
  amenities: string | string[] | undefined;
  imageUrls: string | string[] | undefined;
  parkingAvailable?: boolean;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await req.json() as PropertyData;
    console.log("Received property data:", data);

    // Validate required fields
    if (!data.name || !data.address || !data.propertyType || !data.latitude || !data.longitude) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Parse JSON strings if they're already stringified
    const amenities = typeof data.amenities === 'string' ? data.amenities : JSON.stringify(data.amenities ?? []);
    const imageUrls = typeof data.imageUrls === 'string' ? data.imageUrls : JSON.stringify(data.imageUrls ?? []);

    // Detect currency based on property coordinates
    const currency = detectCurrencyFromCoordinates(data.latitude, data.longitude);

    // Create property in database
    const [property] = await db
      .insert(properties)
      .values({
        userId: userId,
        name: data.name,
        address: data.address,
        country: data.country ?? "US",
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
        currency: currency.code,
        description: data.description ?? "",
        yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt) : null,
        totalUnits: 0,
        propertyType: data.propertyType,
        amenities: amenities,
        parkingAvailable: Boolean(data.parkingAvailable),
        imageUrls: imageUrls,
      })
      .returning();

    console.log("Created property:", property);

    // Assign landlord role to the user
    try {
      await addRoleToUserByAuthId(userId, "landlord");
    } catch (roleError) {
      // Log but don't fail the request - property was created successfully
      console.error("Error assigning landlord role:", roleError);
    }

    // Track property creation event in PostHog
    await capturePostHogEvent({
      distinctId: userId,
      event: "property_created",
      properties: {
        property_id: property?.id,
        property_type: data.propertyType,
        country: data.country ?? "US",
        currency: currency.code,
        has_parking: Boolean(data.parkingAvailable),
        source: "api",
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error("Error creating property:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userProperties = await db.query.properties.findMany({
      where: eq(properties.userId, userId),
    });

    console.log("API response properties:", userProperties);

    return NextResponse.json(userProperties);
  } catch (error) {
    console.error("Error fetching properties:", error);
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
} 