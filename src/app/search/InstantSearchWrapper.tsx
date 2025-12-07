"use client";

import { useState } from "react";
import { InstantSearch } from "react-instantsearch";
import { searchClient, UNITS_INDEX } from "~/lib/algolia-client";
import { SearchFilters } from "./SearchFilters";
import { SearchHits } from "./SearchHits";
import { SearchMap } from "./SearchMap";
import { GeoSearch } from "./GeoSearch";
import { useSearchParams } from "next/navigation";
import { List, Map } from "lucide-react";
import { Button } from "~/components/ui/button";

export function InstantSearchWrapper() {
  const searchParams = useSearchParams();
  const initialPlaceId = searchParams.get("placeId") ?? undefined;
  const initialPlaceName = searchParams.get("placeName") ?? undefined;
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
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
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Search Properties</h1>
          <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="gap-2"
            >
              <Map className="h-4 w-4" />
              Map
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GeoSearch initialPlaceId={initialPlaceId} initialPlaceName={initialPlaceName} />
          <SearchFilters initialFilters={initialFilters} />
        </div>
      </div>

      {viewMode === "list" ? <SearchHits /> : <SearchMap />}
    </InstantSearch>
  );
}
