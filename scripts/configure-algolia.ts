// Script to configure Algolia index settings
// Run with: npx tsx scripts/configure-algolia.ts

import { config } from 'dotenv';
import { algoliasearch } from 'algoliasearch';

config();

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;

if (!appId || !adminKey) {
  console.error('Missing Algolia credentials. Please set NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY');
  process.exit(1);
}

const client = algoliasearch(appId, adminKey);

async function configureIndex() {
  console.log('Configuring Algolia "units" index...');
  
  await client.setSettings({
    indexName: 'units',
    indexSettings: {
      // Searchable attributes (in order of importance)
      searchableAttributes: [
        'address',
        'propertyName',
        'description',
        'features',
        'propertyType',
        'unitNumber',
      ],
      
    // Attributes for filtering
    attributesForFaceting: [
      'filterOnly(isVisible)',
      'filterOnly(isAvailable)',
      'country',
      'numBedrooms',
      'numBathrooms',
      'propertyType',
      'currency',
    ],      // Attributes to retrieve
      attributesToRetrieve: [
        'objectID',
        'unitId',
        'propertyId',
        'propertyName',
        'address',
        'country',
        'unitNumber',
        'description',
        'numBedrooms',
        'numBathrooms',
        'squareFeet',
        'monthlyRent',
        'deposit',
        'currency',
        'propertyType',
        'features',
        'imageUrl',
        'imageUrls',
        'isAvailable',
        'isVisible',
        'availableFrom',
        '_geoloc',
      ],
      
      // Custom ranking (you can adjust this)
      customRanking: ['asc(monthlyRent)'],
      
      // Enable typo tolerance
      typoTolerance: true,
      
      // Highlight matching text
      attributesToHighlight: ['address', 'propertyName', 'description'],
    },
  });

  console.log('✅ Algolia index configured successfully!');
  console.log('\nIndex settings applied:');
  console.log('- Searchable attributes: address, propertyName, description, features, propertyType, unitNumber');
  console.log('- Facets: isAvailable, numBedrooms, numBathrooms, propertyType, currency');
  console.log('- Custom ranking: by monthly rent (ascending)');
  console.log('- Geo search: enabled via _geoloc field');
}

configureIndex().catch((error: unknown) => {
  console.error('Failed to configure Algolia index:', error);
  process.exit(1);
});
