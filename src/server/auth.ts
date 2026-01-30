/**
 * Shared API authentication helpers.
 * Eliminates repeated auth + DB lookup + role check boilerplate across routes.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { user, tenantProfiles } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { hasRole } from "~/lib/roles";

type DbUser = typeof user.$inferSelect;
type TenantProfile = typeof tenantProfiles.$inferSelect;

type AuthSuccess = { user: DbUser; error?: never };
type AuthError = { user?: never; error: NextResponse };

type AuthWithProfileSuccess = { user: DbUser; profile: TenantProfile; error?: never };
type AuthWithProfileError = { user?: never; profile?: never; error: NextResponse };

/**
 * Authenticate the request and look up the database user.
 * Returns the user or an error NextResponse.
 */
export async function getAuthenticatedUser(): Promise<AuthSuccess | AuthError> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  return { user: dbUser };
}

/**
 * Authenticate and verify the user has the tenant role.
 */
export async function getAuthenticatedTenant(): Promise<AuthSuccess | AuthError> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser || !hasRole(dbUser.roles, "tenant")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: dbUser };
}

/**
 * Authenticate, verify tenant role, and fetch tenant profile.
 */
export async function getAuthenticatedTenantWithProfile(): Promise<AuthWithProfileSuccess | AuthWithProfileError> {
  const result = await getAuthenticatedTenant();
  if (result.error) return result;

  const [profile] = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, result.user.id))
    .limit(1);

  if (!profile) {
    return { error: NextResponse.json({ error: "Tenant profile not found" }, { status: 400 }) };
  }

  return { user: result.user, profile };
}
