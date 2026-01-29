import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Valid role types
export type UserRole = "user" | "tenant" | "landlord";

// Default role for new users who haven't taken any action
export const DEFAULT_ROLE: UserRole = "user";

/**
 * Parse roles from the database text field
 * Returns an array of roles, defaulting to ["user"] if empty
 */
export function parseRoles(rolesText: string | null | undefined): UserRole[] {
  if (!rolesText) {
    return [DEFAULT_ROLE];
  }

  try {
    const parsed = JSON.parse(rolesText) as unknown;
    if (Array.isArray(parsed)) {
      // Filter to only valid roles
      const validRoles = parsed.filter(
        (role): role is UserRole =>
          typeof role === "string" && ["user", "tenant", "landlord"].includes(role)
      );
      return validRoles.length > 0 ? validRoles : [DEFAULT_ROLE];
    }
  } catch {
    // If parsing fails, check if it's a comma-separated string
    const roles = rolesText.split(",").map((r) => r.trim().toLowerCase());
    const validRoles = roles.filter(
      (role): role is UserRole => ["user", "tenant", "landlord"].includes(role)
    );
    return validRoles.length > 0 ? validRoles : [DEFAULT_ROLE];
  }

  return [DEFAULT_ROLE];
}

/**
 * Serialize roles array to JSON string for database storage
 */
export function serializeRoles(roles: UserRole[]): string {
  // Remove duplicates and ensure at least "user" role
  const uniqueRoles = [...new Set(roles)];
  if (uniqueRoles.length === 0) {
    uniqueRoles.push(DEFAULT_ROLE);
  }
  return JSON.stringify(uniqueRoles);
}

/**
 * Check if a user has a specific role
 */
export function hasRole(rolesText: string | null | undefined, role: UserRole): boolean {
  const roles = parseRoles(rolesText);
  return roles.includes(role);
}

/**
 * Add a role to user's existing roles (returns new roles array)
 */
export function addRole(rolesText: string | null | undefined, role: UserRole): UserRole[] {
  const roles = parseRoles(rolesText);
  if (!roles.includes(role)) {
    roles.push(role);
  }
  return roles;
}

/**
 * Remove a role from user's roles (returns new roles array)
 */
export function removeRole(rolesText: string | null | undefined, role: UserRole): UserRole[] {
  const roles = parseRoles(rolesText);
  const filtered = roles.filter((r) => r !== role);
  // Always keep at least "user" role
  return filtered.length > 0 ? filtered : [DEFAULT_ROLE];
}

/**
 * Add a role to a user by their database ID
 */
export async function addRoleToUserById(userId: number, role: UserRole): Promise<void> {
  const [existingUser] = await db
    .select({ roles: user.roles })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existingUser) {
    throw new Error(`User with ID ${userId} not found`);
  }

  const newRoles = addRole(existingUser.roles, role);

  await db
    .update(user)
    .set({ roles: serializeRoles(newRoles) })
    .where(eq(user.id, userId));
}

/**
 * Add a role to a user by their Clerk auth ID
 */
export async function addRoleToUserByAuthId(authId: string, role: UserRole): Promise<void> {
  const [existingUser] = await db
    .select({ id: user.id, roles: user.roles })
    .from(user)
    .where(eq(user.auth_id, authId))
    .limit(1);

  if (!existingUser) {
    throw new Error(`User with auth_id ${authId} not found`);
  }

  const newRoles = addRole(existingUser.roles, role);

  await db
    .update(user)
    .set({ roles: serializeRoles(newRoles) })
    .where(eq(user.id, existingUser.id));
}

/**
 * Get roles for a user by their database ID
 */
export async function getUserRolesById(userId: number): Promise<UserRole[]> {
  const [existingUser] = await db
    .select({ roles: user.roles })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existingUser) {
    return [DEFAULT_ROLE];
  }

  return parseRoles(existingUser.roles);
}

/**
 * Get roles for a user by their Clerk auth ID
 */
export async function getUserRolesByAuthId(authId: string): Promise<UserRole[]> {
  const [existingUser] = await db
    .select({ roles: user.roles })
    .from(user)
    .where(eq(user.auth_id, authId))
    .limit(1);

  if (!existingUser) {
    return [DEFAULT_ROLE];
  }

  return parseRoles(existingUser.roles);
}

/**
 * Check if user is an admin (uses admin boolean column, not roles)
 * This is a simple helper to check the admin flag on the user record
 */
export function isAdmin(userRecord: { admin: boolean | null }): boolean {
  return userRecord.admin === true;
}
