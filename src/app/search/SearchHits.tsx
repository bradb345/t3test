"use client";

import { useHits, useInstantSearch } from "react-instantsearch";
import { PropertyListingCard } from "~/components/PropertyListingCard";
import type { UnitSearchRecord } from "~/lib/algolia";

type Hit = UnitSearchRecord & {
  __position: number;
  __queryID?: string;
};

export function SearchHits() {
  const { items: hits } = useHits<Hit>();
  const { status, results } = useInstantSearch();

  if (status === "loading" || status === "stalled") {
    return (
      <div className="flex flex-col gap-4">
        {[...Array<undefined>(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex h-[220px] overflow-hidden rounded-lg border">
              <div className="h-full w-[280px] shrink-0 bg-muted" />
              <div className="flex-1 p-5">
                <div className="mb-3 h-8 w-32 rounded bg-muted" />
                <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
                <div className="mb-4 h-4 w-1/2 rounded bg-muted" />
                <div className="flex gap-4">
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-lg">No properties found</p>
        <p className="mt-2 text-sm">Try adjusting your search or location filters.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {results?.nbHits ?? 0} result{results?.nbHits !== 1 ? "s" : ""}
          {results?.query && <span> for &quot;{results.query}&quot;</span>}
          {results?.processingTimeMS && (
            <span className="ml-2 text-xs">({results.processingTimeMS}ms)</span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {hits.map((hit) => (
          <PropertyListingCard key={hit.objectID} unit={hit} />
        ))}
      </div>
    </div>
  );
}
