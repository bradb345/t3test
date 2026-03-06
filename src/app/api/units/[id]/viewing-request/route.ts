import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import {
  viewingRequests,
  units,
  properties,
  user,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendAppEmail } from "~/lib/emails/server";
import { trackServerEvent } from "~/lib/posthog-events/server";

// POST: Submit a viewing request (public endpoint for prospective tenants)
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    // Look up authenticated user's DB id (if signed in)
    let requesterUserId: number | null = null;
    const { userId: clerkUserId } = await auth();
    if (clerkUserId) {
      const [dbUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.auth_id, clerkUserId))
        .limit(1);
      requesterUserId = dbUser?.id ?? null;
    }

    // Create the viewing request
    const [newRequest] = await db
      .insert(viewingRequests)
      .values({
        unitId,
        requesterUserId,
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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

      if (landlord.email) {
        await sendAppEmail(landlord.email, "viewing_request", {
          landlordName: `${landlord.first_name ?? ""} ${landlord.last_name ?? ""}`.trim() || "Landlord",
          requesterName: body.name,
          requesterEmail: body.email,
          requesterPhone: body.phone?.trim(),
          unitNumber: unitData.unit.unitNumber ?? "N/A",
          propertyName: unitData.property.name,
          preferredDate: preferredDate
            ? preferredDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
            : undefined,
          preferredTime: body.preferredTime?.trim(),
          message: body.message?.trim(),
          dashboardUrl: `${baseUrl}/my-properties?tab=inquiries`,
        });
      }
    }

    // Track viewing request submission in PostHog (use email as distinct ID for anonymous users)
    await trackServerEvent(body.email.trim().toLowerCase(), "viewing_request_submitted", {
        viewing_request_id: newRequest?.id,
        unit_id: unitId,
        property_id: unitData.property.id,
        has_preferred_date: !!body.preferredDate,
        has_message: !!body.message?.trim(),
        source: "api",
      });

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
