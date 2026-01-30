import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import {
  viewingRequests,
  units,
  properties,
  user,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";

// POST: Submit a viewing request (public endpoint for prospective tenants)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unitId = parseInt(params.id);
    if (isNaN(unitId)) {
      return NextResponse.json({ error: "Invalid unit ID" }, { status: 400 });
    }

    // Get the unit with property info
    const [unitData] = await db
      .select({
        unit: units,
        property: properties,
      })
      .from(units)
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(eq(units.id, unitId))
      .limit(1);

    if (!unitData) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Check if unit is visible/available
    if (!unitData.unit.isVisible) {
      return NextResponse.json(
        { error: "This unit is not available for viewing" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      name: string;
      email: string;
      phone?: string;
      preferredDate?: string;
      preferredTime?: string;
      message?: string;
    };

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate input lengths
    if (body.name.trim().length > 256) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }
    if (body.email.trim().length > 256) {
      return NextResponse.json({ error: "Email is too long" }, { status: 400 });
    }
    if (body.phone && body.phone.trim().length > 20) {
      return NextResponse.json({ error: "Phone number is too long" }, { status: 400 });
    }
    if (body.message && body.message.trim().length > 2000) {
      return NextResponse.json({ error: "Message is too long (max 2000 characters)" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate preferredDate if provided
    let preferredDate: Date | null = null;
    if (body.preferredDate) {
      preferredDate = new Date(body.preferredDate);
      if (isNaN(preferredDate.getTime())) {
        return NextResponse.json({ error: "Invalid preferred date" }, { status: 400 });
      }
    }

    // Create the viewing request
    const [newRequest] = await db
      .insert(viewingRequests)
      .values({
        unitId,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() ?? null,
        preferredDate,
        preferredTime: body.preferredTime?.trim() ?? null,
        message: body.message?.trim() ?? null,
        status: "pending",
      })
      .returning();

    // Find the landlord and send notification
    const [landlord] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, unitData.property.userId))
      .limit(1);

    if (landlord) {
      await createAndEmitNotification({
        userId: landlord.id,
        type: "viewing_request",
        title: "New Viewing Request",
        message: `${body.name} has requested to view Unit ${unitData.unit.unitNumber} at ${unitData.property.name}`,
        data: JSON.stringify({
          viewingRequestId: newRequest?.id,
          unitId,
          propertyId: unitData.property.id,
          requesterName: body.name,
          requesterEmail: body.email,
        }),
        actionUrl: `/my-properties?tab=inquiries`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Viewing request submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating viewing request:", error);
    return NextResponse.json(
      { error: "Failed to create viewing request" },
      { status: 500 }
    );
  }
}
