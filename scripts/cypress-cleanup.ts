/**
 * Cypress Test Cleanup Script
 * 
 * This script cleans up any leftover test data from failed Cypress tests.
 * It deletes all properties (and associated units) that have names starting with "Cypress Test Property".
 * 
 * Run with: npx tsx scripts/cypress-cleanup.ts
 * Or before Cypress: npm run cy:clean && npx cypress open
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { like, eq } from 'drizzle-orm';
import { algoliasearch } from 'algoliasearch';
import { extractFileKey, utapi } from '../src/lib/uploadthing';

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

const db = drizzle(sql);

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
  const fileKeys = extractFileKey ? urls.map(extractFileKey).filter((key): key is string => key !== null && key.length > 0) : [];
  
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
 * Main cleanup function
 */
async function cleanupCypressTestData() {
  console.log('\n🧹 Cypress Test Data Cleanup\n');
  console.log('Looking for properties starting with "Cypress Test Property"...\n');

  try {
    // Find all test properties
    const testProperties = await db
      .select()
      .from(properties)
      .where(like(properties.name, 'Cypress Test Property%'));

    if (testProperties.length === 0) {
      console.log('✅ No test properties found. Nothing to clean up!\n');
      await sql.end();
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

    console.log(`\n✅ Cleanup complete! Deleted ${testProperties.length} test properties.\n`);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the cleanup
void cleanupCypressTestData();
