// Script to re-index all units in Algolia
// Run with: npx tsx scripts/reindex-algolia.ts

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { units, properties } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';
import { buildUnitSearchRecord, indexUnits } from '../src/lib/algolia';

config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function reindexAllUnits() {
  console.log('Starting Algolia re-index...\n');

  // Fetch all units with their properties
  const allUnits = await db
    .select()
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id));

  console.log(`Found ${allUnits.length} units to index\n`);

  if (allUnits.length === 0) {
    console.log('No units to index');
    process.exit(0);
  }

  // Build search records
  const searchRecords = allUnits.map(({ unit, property }) => {
    const record = buildUnitSearchRecord(unit, property);
    console.log(`- Unit ${record.unitId}: ${record.propertyName}`);
    console.log(`  Images: ${record.imageUrls.length} (${record.imageUrls.length > 1 ? 'carousel enabled' : 'single image'})`);
    return record;
  });

  console.log('\nIndexing units...');
  await indexUnits(searchRecords);

  console.log('\n✓ Re-indexing complete!');
  console.log(`  Indexed ${searchRecords.length} units with imageUrls field`);
  
  process.exit(0);
}

reindexAllUnits().catch((error: unknown) => {
  console.error('Error during re-index:', error);
  process.exit(1);
});
