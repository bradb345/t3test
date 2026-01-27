import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import {
  maintenanceRequests,
  user,
  leases,
  units,
  properties,
  notifications,
} from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { hasRole } from "~/lib/roles";
import {
  VALID_MAINTENANCE_CATEGORIES,
  VALID_MAINTENANCE_PRIORITIES,
} from "~/lib/constants/maintenance";

// GET: List maintenance requests for tenant
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user and verify tenant role
  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser || !hasRole(dbUser.roles, "tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await db
    .select()
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.requestedBy, dbUser.id))
    .orderBy(desc(maintenanceRequests.createdAt));

  return NextResponse.json(requests);
}

// POST: Create new maintenance request
export async function POST(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser || !hasRole(dbUser.roles, "tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    await db.insert(notifications).values({
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

  return NextResponse.json(newRequest, { status: 201 });
}
