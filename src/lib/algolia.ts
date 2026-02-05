import { algoliasearch } from 'algoliasearch';
import { env } from '~/env';
import type { InferSelectModel } from 'drizzle-orm';
import type { properties, units } from '~/server/db/schema';
import { UNITS_INDEX } from '~/lib/algolia-client';

export { UNITS_INDEX };

type Property = InferSelectModel<typeof properties>;
type Unit = InferSelectModel<typeof units>;

// Algolia client (server-side - for both indexing and searching)
export const algoliaClient = algoliasearch(
  env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  env.ALGOLIA_ADMIN_API_KEY
);

// Search-only client for client-side use
export const algoliaSearchClient = algoliasearch(
  env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
);

// Types for your search records
export interface UnitSearchRecord {
  objectID: string; // Required by Algolia (use unit id)
  unitId: number;
  propertyId: number;
  propertyName: string;
  address: string;
  country: string;
  unitNumber: string;
  description: string | null;
  numBedrooms: number;
  numBathrooms: number;
  squareFeet: number | null;
  monthlyRent: number;
  deposit: number | null;
  currency: string;
  propertyType: string;
  features: string[];
  imageUrl: string | null;
  imageUrls: string[]; // All unit images for carousel
  isAvailable: boolean;
  isVisible: boolean;
  availableFrom: string | null;
  _geoloc: { // Algolia's geo format
    lat: number;
    lng: number;
  };
}

// Helper to build a search record from your DB models
export function buildUnitSearchRecord(unit: Unit, property: Property): UnitSearchRecord {
  const imageUrls = unit.imageUrls ? JSON.parse(unit.imageUrls) as string[] : [];
  const features = unit.features ? JSON.parse(unit.features) as string[] : [];

  return {
    objectID: String(unit.id),
    unitId: unit.id,
    propertyId: property.id,
    propertyName: property.name,
    address: property.address,
    country: property.country,
    unitNumber: unit.unitNumber,
    description: unit.description,
    numBedrooms: unit.numBedrooms,
    numBathrooms: Number(unit.numBathrooms),
    squareFeet: unit.squareFeet,
    monthlyRent: Number(unit.monthlyRent),
    deposit: unit.deposit ? Number(unit.deposit) : null,
    currency: unit.currency,
    propertyType: property.propertyType,
    features,
    imageUrl: imageUrls[0] ?? null,
    imageUrls, // All images for carousel
    isAvailable: unit.isAvailable ?? true,
    isVisible: unit.isVisible ?? false,
    availableFrom: unit.availableFrom ? unit.availableFrom.toISOString() : null,
    _geoloc: {
      lat: Number(property.latitude),
      lng: Number(property.longitude),
    },
  };
}

// Index a unit (call when unit is created/updated)
export async function indexUnit(unit: UnitSearchRecord) {
  await algoliaClient.saveObject({
    indexName: UNITS_INDEX,
    body: unit,
  });
}

// Index multiple units
export async function indexUnits(unitsToIndex: UnitSearchRecord[]) {
  await algoliaClient.saveObjects({
    indexName: UNITS_INDEX,
    objects: unitsToIndex as unknown as Record<string, unknown>[],
  });
}

// Remove a unit from the index
export async function removeUnit(unitId: number) {
  await algoliaClient.deleteObject({
    indexName: UNITS_INDEX,
    objectID: String(unitId),
  });
}

// Update a unit in the index (partial update)
export async function updateUnitIndex(unitId: number, updates: Partial<UnitSearchRecord>) {
  await algoliaClient.partialUpdateObject({
    indexName: UNITS_INDEX,
    objectID: String(unitId),
    attributesToUpdate: updates,
  });
}

// Search response type
export interface SearchResponse {
  hits: UnitSearchRecord[];
  nbHits: number;
  page: number;
  nbPages: number;
  query: string;
  processingTimeMS: number;
}

// Search units
export async function searchUnits(query: string, options?: {
  filters?: string;
  aroundLatLng?: string;
  aroundRadius?: number;
  hitsPerPage?: number;
  page?: number;
}): Promise<SearchResponse> {
  const results = await algoliaSearchClient.searchSingleIndex<UnitSearchRecord>({
    indexName: UNITS_INDEX,
    searchParams: {
      query,
      filters: options?.filters,
      aroundLatLng: options?.aroundLatLng,
      aroundRadius: options?.aroundRadius ?? 50000, // 50km default
      hitsPerPage: options?.hitsPerPage ?? 20,
      page: options?.page ?? 0,
    },
  });
  return results as SearchResponse;
}
