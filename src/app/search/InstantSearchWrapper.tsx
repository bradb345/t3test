"use client";

import { InstantSearch, Configure } from "react-instantsearch";
import { searchClient, UNITS_INDEX } from "~/lib/algolia-client";
import { SearchBox } from "./SearchBox";
import { SearchHits } from "./SearchHits";
import { GeoSearch } from "./GeoSearch";
import { useSearchParams } from "next/navigation";

export function InstantSearchWrapper() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialPlaceId = searchParams.get("placeId") ?? undefined;
  const initialPlaceName = searchParams.get("placeName") ?? undefined;

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={UNITS_INDEX}
      future={{
        preserveSharedStateOnUnmount: true,
      }}
    >
      <Configure
        filters="isVisible:true"
        hitsPerPage={20}
      />
      
      <div className="mb-8">
        <h1 className="mb-4 text-2xl font-bold">Search Properties</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
          <SearchBox defaultValue={initialQuery} />
          <GeoSearch initialPlaceId={initialPlaceId} initialPlaceName={initialPlaceName} />
        </div>
      </div>

      <SearchHits />
    </InstantSearch>
  );
}
