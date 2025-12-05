// Script to test Algolia geo search
// Run with: npx tsx scripts/test-geo-search.ts

import { config } from 'dotenv';
import { algoliasearch } from 'algoliasearch';

config();

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;

if (!appId || !searchKey) {
  console.error('Missing Algolia credentials');
  process.exit(1);
}

const client = algoliasearch(appId, searchKey);

async function testGeoSearch() {
  console.log('Testing Algolia geo search...\n');
  
  // Cayman Islands bounding box from Google:
  // Northeast: lat 19.7616, lng -79.7191
  // Southwest: lat 19.2538, lng -81.4294
  
  // Format: "p1Lat,p1Lng,p2Lat,p2Lng" (diagonally opposite corners)
  const boundingBox = "19.7616,-79.7191,19.2538,-81.4294";
  
  console.log('Using bounding box:', boundingBox);
  console.log('Expected unit at: lat 19.3802, lng -81.4166\n');
  
  try {
    const results = await client.searchSingleIndex({
      indexName: 'units',
      searchParams: {
        query: '',
        filters: 'isVisible:true',
        insideBoundingBox: boundingBox,
      },
    });
    
    console.log(`Found ${results.nbHits} hits`);
    
    if (results.hits.length > 0) {
      console.log('\nHits:');
      for (const hit of results.hits) {
        console.log(`- ${(hit as any).propertyName} @ ${JSON.stringify((hit as any)._geoloc)}`);
      }
    } else {
      console.log('\nNo hits found with bounding box filter.');
      
      // Try without geo filter
      console.log('\nTrying without geo filter...');
      const allResults = await client.searchSingleIndex({
        indexName: 'units',
        searchParams: {
          query: '',
          filters: 'isVisible:true',
        },
      });
      console.log(`Found ${allResults.nbHits} hits without geo filter`);
      for (const hit of allResults.hits) {
        console.log(`- ${(hit as any).propertyName} @ ${JSON.stringify((hit as any)._geoloc)}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testGeoSearch();
