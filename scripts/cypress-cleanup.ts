/**
 * Cypress Test Cleanup Script
 *
 * This script cleans up any leftover test data from failed Cypress tests:
 * 1. Deletes all properties (and associated units) with names starting with "Cypress Test Property"
 * 2. Deletes all test users matching +clerk_test@example.com (except permanent test accounts)
 *
 * Run with: npx tsx scripts/cypress-cleanup.ts
 * Or before Cypress: npm run cy:clean && npx cypress open
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { like, eq, and, notInArray } from 'drizzle-orm';
import { algoliasearch } from 'algoliasearch';
import { extractFileKeys, utapi } from '../src/lib/uploadthing';

// Load environment variables
config();

// Database connection
const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('❌ Missing POSTGRES_URL environment variable');
  process.exit(1);
}

const sql = postgres(connectionString);

// Import schema tables (we need to define them here since we can't use path aliases in scripts)
import {
  serial,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  index,
  pgTableCreator,
} from 'drizzle-orm/pg-core';
import { sql as drizzleSql } from 'drizzle-orm';

// Create table helper (matching the main schema)
const createTable = pgTableCreator((name) => `t3test_${name}`);

// Properties table schema
const properties = createTable(
  "property",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    address: text("address").notNull(),
    country: varchar("country", { length: 2 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KYD"),
    description: text("description"),
    yearBuilt: integer("year_built"),
    totalUnits: integer("total_units"),
    propertyType: varchar("property_type", { length: 50 }).notNull(),
    amenities: text("amenities"),
    parkingAvailable: boolean("parking_available").default(false),
    imageUrls: text("image_urls"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(drizzleSql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (property) => ({
    geoIndex: index("geo_idx").on(property.latitude, property.longitude),
    countryIndex: index("country_idx").on(property.country),
    ownerIndex: index("owner_idx").on(property.userId),
  })
);

// Units table schema
const units = createTable(
  "unit",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KYD"),
    unitNumber: varchar("unit_number", { length: 50 }).notNull(),
    floorPlan: text("floor_plan"),
    squareFeet: integer("square_feet"),
    numBedrooms: integer("num_bedrooms").notNull(),
    numBathrooms: decimal("num_bathrooms", { precision: 3, scale: 1 }).notNull(),
    monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
    deposit: decimal("deposit", { precision: 10, scale: 2 }),
    isAvailable: boolean("is_available").default(true),
    isVisible: boolean("is_visible").default(false),
    availableFrom: timestamp("available_from", { withTimezone: true }),
    features: text("features"),
    description: text("description"),
    imageUrls: text("image_urls"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(drizzleSql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (unit) => ({
    propertyIndex: index("property_idx").on(unit.propertyId),
    availabilityIndex: index("availability_idx").on(unit.isAvailable, unit.isVisible),
  })
);

// User table schema (minimal, only fields needed for cleanup)
const users = createTable(
  "user",
  {
    id: serial("id").primaryKey(),
    auth_id: varchar("auth_id", { length: 256 }).notNull(),
    email: varchar("email", { length: 256 }).notNull(),
    first_name: varchar("first_name", { length: 256 }).notNull(),
    last_name: varchar("last_name", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(drizzleSql`CURRENT_TIMESTAMP`)
      .notNull(),
  }
);

const db = drizzle(sql);

// Protected test accounts that should never be deleted
const PROTECTED_EMAILS = [
  'doe+clerk_test@example.com',
  'smith+clerk_test@example.com',
  'jones+clerk_test@example.com',
];

// Algolia setup
const algoliaAppId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const algoliaAdminKey = process.env.ALGOLIA_ADMIN_API_KEY;

let algoliaClient: ReturnType<typeof algoliasearch> | null = null;
if (algoliaAppId && algoliaAdminKey) {
  algoliaClient = algoliasearch(algoliaAppId, algoliaAdminKey);
}

/**
 * Delete files from UploadThing with error handling for cleanup script
 */
async function deleteFilesFromUploadThingSafe(urls: string[], context: string): Promise<void> {
  const fileKeys = extractFileKeys(urls)
  
  if (fileKeys.length > 0) {
    console.log(`  📁 Deleting ${fileKeys.length} files from UploadThing (${context})`);
    try {
      await utapi.deleteFiles(fileKeys);
    } catch (error) {
      console.warn(`  ⚠️  Failed to delete files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Remove unit from Algolia
 */
async function removeUnitFromAlgolia(unitId: number): Promise<void> {
  if (!algoliaClient) {
    console.log(`  ⚠️  Skipping Algolia removal (no credentials)`);
    return;
  }
  
  try {
    await algoliaClient.deleteObject({
      indexName: 'units',
      objectID: String(unitId),
    });
  } catch (error) {
    console.warn(`  ⚠️  Failed to remove unit ${unitId} from Algolia: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a user from Clerk using the REST API
 */
async function deleteClerkUser(authId: string): Promise<boolean> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    console.log(`   ⚠️  Skipping Clerk deletion (no CLERK_SECRET_KEY)`);
    return false;
  }

  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${authId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
      },
    });

    if (response.ok) {
      return true;
    }

    // 404 means user already doesn't exist in Clerk
    if (response.status === 404) {
      console.log(`   ⚠️  User ${authId} not found in Clerk (already deleted)`);
      return true;
    }

    const errorText = await response.text();
    console.error(`   ❌ Failed to delete Clerk user ${authId}: ${response.status} ${errorText}`);
    return false;
  } catch (error) {
    console.error(`   ❌ Error deleting Clerk user ${authId}:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Clean up test properties and associated units
 */
async function cleanupTestProperties() {
  console.log('Looking for properties starting with "Cypress Test Property"...\n');

  const testProperties = await db
    .select()
    .from(properties)
    .where(like(properties.name, 'Cypress Test Property%'));

  if (testProperties.length === 0) {
    console.log('✅ No test properties found.\n');
    return;
  }

  console.log(`Found ${testProperties.length} test properties to delete:\n`);

  for (const property of testProperties) {
    console.log(`📍 Property: "${property.name}" (ID: ${property.id})`);
    console.log(`   Address: ${property.address}`);
    console.log(`   Created: ${property.createdAt.toISOString()}`);

    // Get all units for this property
    const propertyUnits = await db
      .select()
      .from(units)
      .where(eq(units.propertyId, property.id));

    console.log(`   Units: ${propertyUnits.length}`);

    // Delete each unit's data
    for (const unit of propertyUnits) {
      console.log(`\n   🏠 Unit ${unit.unitNumber} (ID: ${unit.id})`);

      // Remove from Algolia
      console.log(`      Removing from Algolia...`);
      await removeUnitFromAlgolia(unit.id);

      // Delete unit images from UploadThing
      if (unit.imageUrls) {
        try {
          const imageUrls = JSON.parse(unit.imageUrls) as string[];
          await deleteFilesFromUploadThingSafe(imageUrls, `unit ${unit.id} images`);
        } catch {
          console.warn(`      ⚠️  Failed to parse unit image URLs`);
        }
      }

      // Delete floor plan from UploadThing
      if (unit.floorPlan) {
        try {
          const floorPlanUrls = JSON.parse(unit.floorPlan) as string[];
          await deleteFilesFromUploadThingSafe(floorPlanUrls, `unit ${unit.id} floor plan`);
        } catch {
          console.warn(`      ⚠️  Failed to parse floor plan URLs`);
        }
      }
    }

    // Delete property images from UploadThing
    if (property.imageUrls) {
      try {
        const imageUrls = JSON.parse(property.imageUrls) as string[];
        await deleteFilesFromUploadThingSafe(imageUrls, `property ${property.id} images`);
      } catch {
        console.warn(`   ⚠️  Failed to parse property image URLs`);
      }
    }

    // Delete viewing requests, tenancy applications, and invitations for each unit (FK constraints)
    for (const unit of propertyUnits) {
      const deletedViewings = await sql`
        DELETE FROM t3test_viewing_request WHERE unit_id = ${unit.id}
      `;
      if (deletedViewings.count > 0) {
        console.log(`      🗑️  Deleted ${deletedViewings.count} viewing requests for unit ${unit.id}`);
      }

      const deletedApplications = await sql`
        DELETE FROM t3test_tenancy_application WHERE unit_id = ${unit.id}
      `;
      if (deletedApplications.count > 0) {
        console.log(`      🗑️  Deleted ${deletedApplications.count} tenancy applications for unit ${unit.id}`);
      }

      // Delete onboarding progress tied to invitations for this unit
      await sql`
        DELETE FROM t3test_tenant_onboarding_progress
        WHERE invitation_id IN (
          SELECT id FROM t3test_tenant_invitation WHERE unit_id = ${unit.id}
        )
      `;

      const deletedInvitations = await sql`
        DELETE FROM t3test_tenant_invitation WHERE unit_id = ${unit.id}
      `;
      if (deletedInvitations.count > 0) {
        console.log(`      🗑️  Deleted ${deletedInvitations.count} tenant invitations for unit ${unit.id}`);
      }
    }

    // Delete units from database
    if (propertyUnits.length > 0) {
      console.log(`\n   🗑️  Deleting ${propertyUnits.length} units from database...`);
      await db
        .delete(units)
        .where(eq(units.propertyId, property.id));
    }

    // Delete property from database
    console.log(`   🗑️  Deleting property from database...`);
    await db
      .delete(properties)
      .where(eq(properties.id, property.id));

    console.log(`   ✅ Property deleted successfully\n`);
  }

  console.log(`✅ Deleted ${testProperties.length} test properties.\n`);
}

/**
 * Clean up test users from Clerk and database (excluding permanent test accounts)
 */
async function cleanupTestUsers() {
  console.log('Looking for test users matching "+clerk_test@example.com"...');
  console.log(`Protected emails: ${PROTECTED_EMAILS.join(', ')}\n`);

  const testUsers = await db
    .select()
    .from(users)
    .where(
      and(
        like(users.email, '%+clerk_test@example.com'),
        notInArray(users.email, PROTECTED_EMAILS),
      )
    );

  if (testUsers.length === 0) {
    console.log('✅ No test users found.\n');
    return;
  }

  console.log(`Found ${testUsers.length} test user(s) to delete:\n`);

  let deletedCount = 0;

  for (const user of testUsers) {
    console.log(`👤 User: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`   Auth ID: ${user.auth_id}`);
    console.log(`   Created: ${user.createdAt.toISOString()}`);

    // Delete from Clerk first
    console.log(`   🔑 Deleting from Clerk...`);
    const clerkDeleted = await deleteClerkUser(user.auth_id);

    if (clerkDeleted) {
      // Delete from database
      console.log(`   🗑️  Deleting from database...`);
      await db
        .delete(users)
        .where(eq(users.email, user.email));

      console.log(`   ✅ User deleted successfully\n`);
      deletedCount++;
    } else {
      console.log(`   ⚠️  Skipping database deletion due to Clerk error\n`);
    }
  }

  console.log(`✅ Deleted ${deletedCount}/${testUsers.length} test users.\n`);
}

/**
 * Reset the offboarding test tenant's unit to a clean state.
 * Deletes offboarding notices, leases, invitations, and onboarding progress
 * for each protected test tenant email, and marks their units as available.
 */
async function cleanupOffboardingTestData() {
  console.log('Resetting offboarding test data for protected test tenants...\n');

  for (const email of PROTECTED_EMAILS) {
    console.log(`👤 Resetting: ${email}`);

    // Find the test tenant user
    const tenantRows = await sql`
      SELECT id FROM t3test_user WHERE email = ${email} LIMIT 1
    `;
    const tenantId = tenantRows[0]?.id as number | undefined;

    if (tenantId) {
      // Update the user's name to match what the offboarding test expects
      if (email === 'smith+clerk_test@example.com') {
        await sql`
          UPDATE t3test_user
          SET first_name = 'Test', last_name = 'Tenant'
          WHERE id = ${tenantId}
        `;
        console.log(`   📝 Reset user name to "Test Tenant"`);
      }

      // Delete offboarding notices for the tenant's leases
      const deletedNotices = await sql`
        DELETE FROM t3test_tenant_offboarding_notice
        WHERE lease_id IN (
          SELECT id FROM t3test_lease WHERE tenant_id = ${tenantId}
        )
      `;
      console.log(`   🗑️  Deleted ${deletedNotices.count} offboarding notices`);

      // Get unit IDs from the tenant's leases before deleting them
      const leaseUnits = await sql`
        SELECT unit_id FROM t3test_lease WHERE tenant_id = ${tenantId}
      `;

      // Delete the tenant's leases
      const deletedLeases = await sql`
        DELETE FROM t3test_lease WHERE tenant_id = ${tenantId}
      `;
      console.log(`   🗑️  Deleted ${deletedLeases.count} leases`);

      // Mark those units as available
      for (const row of leaseUnits) {
        await sql`
          UPDATE t3test_unit
          SET is_available = true, is_visible = false, updated_at = NOW()
          WHERE id = ${row.unit_id}
        `;
        console.log(`   🏠 Reset unit ${row.unit_id} to available`);
      }
    } else {
      console.log(`   ⚠️  User not found in database, skipping lease/notice cleanup`);
    }

    // Delete onboarding progress records for invitations
    const deletedProgress = await sql`
      DELETE FROM t3test_tenant_onboarding_progress
      WHERE invitation_id IN (
        SELECT id FROM t3test_tenant_invitation WHERE tenant_email = ${email}
      )
    `;
    console.log(`   🗑️  Deleted ${deletedProgress.count} onboarding progress records`);

    // Delete invitations
    const deletedInvitations = await sql`
      DELETE FROM t3test_tenant_invitation WHERE tenant_email = ${email}
    `;
    console.log(`   🗑️  Deleted ${deletedInvitations.count} invitations`);

    console.log(`   ✅ Done\n`);
  }

  console.log('✅ Offboarding test data reset complete.\n');
}

/**
 * Resolve protected test user emails to database IDs.
 */
async function getProtectedTestUserIds(): Promise<number[]> {
  const testUsers = await sql`
    SELECT id FROM t3test_user
    WHERE email IN ${sql(PROTECTED_EMAILS)}
  `;
  return (testUsers as { id: number }[]).map((u) => u.id);
}

/**
 * Clean up messages between protected test users (tenant journey test data).
 */
async function cleanupTenantJourneyMessages(testUserIds: number[]) {
  console.log('Cleaning up messages between test users...\n');

  if (testUserIds.length >= 2) {
    const deleted = await sql`
      DELETE FROM t3test_message
      WHERE from_user_id IN ${sql(testUserIds)}
        AND to_user_id IN ${sql(testUserIds)}
    `;
    console.log(`🗑️  Deleted ${deleted.count} messages between test users.\n`);
  } else {
    console.log('⚠️  Could not find test users, skipping message cleanup.\n');
  }
}

/**
 * Clean up notifications for protected test users.
 */
async function cleanupTestUserNotifications(testUserIds: number[]) {
  console.log('Cleaning up notifications for test users...\n');

  if (testUserIds.length > 0) {
    const deleted = await sql`
      DELETE FROM t3test_notification
      WHERE user_id IN ${sql(testUserIds)}
    `;
    console.log(`🗑️  Deleted ${deleted.count} notifications for test users.\n`);
  } else {
    console.log('⚠️  Could not find test users, skipping notification cleanup.\n');
  }
}

/**
 * Main cleanup function
 */
async function cleanupCypressTestData() {
  console.log('\n🧹 Cypress Test Data Cleanup\n');

  try {
    await cleanupTestProperties();
    const testUserIds = await getProtectedTestUserIds();
    await cleanupTenantJourneyMessages(testUserIds);
    await cleanupTestUserNotifications(testUserIds);
    await cleanupTestUsers();
    await cleanupOffboardingTestData();
    console.log('✅ All cleanup complete!\n');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the cleanup
void cleanupCypressTestData();
