"use client";

import { InstantSearch } from "react-instantsearch";
import { searchClient, UNITS_INDEX } from "~/lib/algolia-client";
import { SearchFilters } from "./SearchFilters";
import { SearchHits } from "./SearchHits";
import { GeoSearch } from "./GeoSearch";
import { useSearchParams } from "next/navigation";

export function InstantSearchWrapper() {
  const searchParams = useSearchParams();
  const initialPlaceId = searchParams.get("placeId") ?? undefined;
  const initialPlaceName = searchParams.get("placeName") ?? undefined;
  
  // Parse filter params from URL
  const initialFilters = {
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    bedrooms: searchParams.get("beds") ? Number(searchParams.get("beds")) : undefined,
    bathrooms: searchParams.get("baths") ? Number(searchParams.get("baths")) : undefined,
    propertyTypes: searchParams.get("types")?.split(",").filter(Boolean) ?? [],
  };

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={UNITS_INDEX}
      future={{
        preserveSharedStateOnUnmount: true,
      }}
    >
      <div className="mb-8">
        <h1 className="mb-4 text-2xl font-bold">Search Properties</h1>
        <div className="flex flex-wrap items-center gap-2">
          <GeoSearch initialPlaceId={initialPlaceId} initialPlaceName={initialPlaceName} />
          <SearchFilters initialFilters={initialFilters} />
        </div>
      </div>

      <SearchHits />
    </InstantSearch>
  );
}
