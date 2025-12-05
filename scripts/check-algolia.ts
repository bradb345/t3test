// Script to check Algolia index contents
// Run with: npx tsx scripts/check-algolia.ts

import { config } from 'dotenv';
import { algoliasearch } from 'algoliasearch';

config();

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;

if (!appId || !adminKey) {
  console.error('Missing Algolia credentials');
  process.exit(1);
}

const client = algoliasearch(appId, adminKey);

async function checkIndex() {
  console.log('Checking Algolia "units" index...\n');
  
  // Browse all records
  const results = await client.searchSingleIndex({
    indexName: 'units',
    searchParams: {
      query: '',
      hitsPerPage: 100,
    },
  });

  console.log(`Total records: ${results.nbHits}\n`);

  if (results.hits.length === 0) {
    console.log('No records found in index!');
    return;
  }

  console.log('Sample records:');
  for (const hit of results.hits.slice(0, 5)) {
    console.log('\n---');
    console.log('objectID:', hit.objectID);
    console.log('propertyName:', (hit as any).propertyName);
    console.log('address:', (hit as any).address);
    console.log('country:', (hit as any).country);
    console.log('isVisible:', (hit as any).isVisible);
    console.log('_geoloc:', JSON.stringify((hit as any)._geoloc));
  }

  // Check for units without _geoloc
  const unitsWithoutGeo = results.hits.filter(h => !(h as any)._geoloc);
  console.log(`\n\nUnits without _geoloc: ${unitsWithoutGeo.length}`);

  // Check for units in Cayman Islands
  const caymanUnits = results.hits.filter(h => 
    (h as any).country === 'KY' || 
    (h as any).address?.toLowerCase().includes('cayman')
  );
  console.log(`Units in Cayman Islands: ${caymanUnits.length}`);

  if (caymanUnits.length > 0) {
    console.log('\nCayman Islands units:');
    for (const unit of caymanUnits) {
      console.log(`- ${(unit as any).propertyName}: ${JSON.stringify((unit as any)._geoloc)}`);
    }
  }
}

checkIndex().catch(console.error);
