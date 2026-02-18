import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import {
  maintenanceRequests,
  user,
  leases,
  units,
  properties,
} from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import {
  VALID_MAINTENANCE_CATEGORIES,
  VALID_MAINTENANCE_PRIORITIES,
} from "~/lib/constants/maintenance";
import { getAuthenticatedTenant } from "~/server/auth";
import { trackServerEvent } from "~/lib/posthog-events/server";

// GET: List maintenance requests for tenant
export async function GET() {
  const auth = await getAuthenticatedTenant();
  if (auth.error) return auth.error;

  const requests = await db
    .select()
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.requestedBy, auth.user.id))
    .orderBy(desc(maintenanceRequests.createdAt));

  return NextResponse.json(requests);
}

// POST: Create new maintenance request
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedTenant();
  if (auth.error) return auth.error;

  const dbUser = auth.user;

  // Get tenant's active lease with unit and property info
  const [leaseData] = await db
    .select({
      lease: leases,
      unit: units,
      property: properties,
    })
    .from(leases)
    .innerJoin(units, eq(units.id, leases.unitId))
    .innerJoin(properties, eq(properties.id, units.propertyId))
    .where(and(eq(leases.tenantId, dbUser.id), eq(leases.status, "active")))
    .limit(1);

  if (!leaseData) {
    return NextResponse.json(
      { error: "No active lease found" },
      { status: 400 }
    );
  }

  const lease = leaseData.lease;

  const body = (await request.json()) as {
    title: string;
    description: string;
    category: string;
    priority: string;
    imageUrls?: string[];
  };

  // Validate required fields
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.description?.trim()) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    );
  }
  if (!body.category?.trim()) {
    return NextResponse.json(
      { error: "Category is required" },
      { status: 400 }
    );
  }
  if (!body.priority?.trim()) {
    return NextResponse.json(
      { error: "Priority is required" },
      { status: 400 }
    );
  }

  // Validate category
  if (!VALID_MAINTENANCE_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Validate priority
  if (!VALID_MAINTENANCE_PRIORITIES.includes(body.priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  const [newRequest] = await db
    .insert(maintenanceRequests)
    .values({
      unitId: lease.unitId,
      requestedBy: dbUser.id,
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category,
      priority: body.priority,
      imageUrls: body.imageUrls ? JSON.stringify(body.imageUrls) : null,
      status: "pending",
    })
    .returning();

  // Notify landlord about new maintenance request
  const [landlord] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, leaseData.property.userId))
    .limit(1);

  if (landlord && newRequest) {
    const tenantName = `${dbUser.first_name} ${dbUser.last_name}`;
    await createAndEmitNotification({
      userId: landlord.id,
      type: "maintenance_request",
      title: "New Maintenance Request",
      message: `${tenantName} submitted a ${body.priority} priority ${body.category} request: ${body.title}`,
      data: JSON.stringify({
        maintenanceRequestId: newRequest.id,
        unitId: lease.unitId,
        tenantName,
        category: body.category,
        priority: body.priority,
      }),
      actionUrl: `/my-properties?tab=maintenance`,
    });
  }

  // Track maintenance request creation in PostHog
  if (newRequest) {
    await trackServerEvent(dbUser.auth_id, "maintenance_request_created", {
        maintenance_request_id: newRequest.id,
        category: body.category,
        priority: body.priority,
        unit_id: lease.unitId,
        property_id: leaseData.property.id,
        has_images: !!body.imageUrls && body.imageUrls.length > 0,
        source: "api",
      });
  }

  return NextResponse.json(newRequest, { status: 201 });
}
