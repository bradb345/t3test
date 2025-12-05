"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { MapPin, Bed, Bath, Square } from "lucide-react";
import type { UnitSearchRecord } from "~/lib/algolia";

interface SearchResponse {
  hits: UnitSearchRecord[];
  totalHits: number;
  page: number;
  totalPages: number;
  query: string;
  processingTimeMS: number;
}

export function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      if (!query) {
        setResults(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("q", query);
        
        // Add any additional filters from URL
        const bedrooms = searchParams.get("bedrooms");
        const maxRent = searchParams.get("maxRent");
        const minRent = searchParams.get("minRent");
        const propertyType = searchParams.get("propertyType");

        if (bedrooms) params.set("bedrooms", bedrooms);
        if (maxRent) params.set("maxRent", maxRent);
        if (minRent) params.set("minRent", minRent);
        if (propertyType) params.set("propertyType", propertyType);

        const response = await fetch(`/api/search?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json() as SearchResponse;
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    void fetchResults();
  }, [query, searchParams]);

  if (!query) {
    return (
      <div className="text-center text-muted-foreground">
        <p>Enter a search term to find available rentals.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array<undefined>(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 rounded-lg bg-muted" />
            <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
            <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!results || results.hits.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        <p>No results found for &quot;{query}&quot;</p>
        <p className="mt-2 text-sm">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {results.totalHits} result{results.totalHits !== 1 ? "s" : ""} for &quot;{results.query}&quot;
          <span className="ml-2 text-xs">({results.processingTimeMS}ms)</span>
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {results.hits.map((unit) => (
          <UnitCard key={unit.objectID} unit={unit} />
        ))}
      </div>

      {results.totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <p className="text-sm text-muted-foreground">
            Page {results.page + 1} of {results.totalPages}
          </p>
        </div>
      )}
    </div>
  );
}

function UnitCard({ unit }: { unit: UnitSearchRecord }) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Link href={`/units/${unit.unitId}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative h-48 w-full bg-muted">
          {unit.imageUrl ? (
            <Image
              src={unit.imageUrl}
              alt={`${unit.propertyName} - Unit ${unit.unitNumber}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
          {unit.isAvailable && (
            <Badge className="absolute right-2 top-2" variant="secondary">
              Available
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{unit.propertyName}</h3>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(unit.monthlyRent, unit.currency)}/mo
            </span>
          </div>
          
          <div className="mb-3 flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-1 h-4 w-4" />
            <span className="truncate">{unit.address}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Bed className="mr-1 h-4 w-4" />
              <span>{unit.numBedrooms} bed</span>
            </div>
            <div className="flex items-center">
              <Bath className="mr-1 h-4 w-4" />
              <span>{unit.numBathrooms} bath</span>
            </div>
            {unit.squareFeet && (
              <div className="flex items-center">
                <Square className="mr-1 h-4 w-4" />
                <span>{unit.squareFeet} sq ft</span>
              </div>
            )}
          </div>

          {unit.features.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {unit.features.slice(0, 3).map((feature) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {unit.features.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{unit.features.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
