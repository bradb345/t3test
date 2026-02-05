"use client";

import { useState } from "react";
import { useConfigure, useSearchBox } from "react-instantsearch";
import { Button } from "~/components/ui/button";
import { ChevronDown, X, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import posthog from "posthog-js";

// Bedroom/Bathroom button options
const BEDROOM_OPTIONS = [
  { label: "Any", value: null },
  { label: "1+", value: 1 },
  { label: "2+", value: 2 },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
];

const BATHROOM_OPTIONS = [
  { label: "Any", value: null },
  { label: "1+", value: 1 },
  { label: "2+", value: 2 },
  { label: "3+", value: 3 },
];

const PROPERTY_TYPES = [
  { label: "Apartment", value: "apartment" },
  { label: "House", value: "house" },
  { label: "Condo", value: "condo" },
  { label: "Townhouse", value: "townhouse" },
];

// Price range presets
const PRICE_RANGES = [
  { label: "Any price", min: null, max: null },
  { label: "Under $1,000", min: null, max: 1000 },
  { label: "$1,000 - $2,000", min: 1000, max: 2000 },
  { label: "$2,000 - $3,000", min: 2000, max: 3000 },
  { label: "$3,000 - $5,000", min: 3000, max: 5000 },
  { label: "$5,000+", min: 5000, max: null },
];

interface SearchFiltersProps {
  initialFilters?: {
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyTypes?: string[];
  };
}

export function SearchFilters({ initialFilters }: SearchFiltersProps) {
  // Local state for filter values
  const [minPrice, setMinPrice] = useState<number | null>(initialFilters?.minPrice ?? null);
  const [maxPrice, setMaxPrice] = useState<number | null>(initialFilters?.maxPrice ?? null);
  const [minBedrooms, setMinBedrooms] = useState<number | null>(initialFilters?.bedrooms ?? null);
  const [minBathrooms, setMinBathrooms] = useState<number | null>(initialFilters?.bathrooms ?? null);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(
    initialFilters?.propertyTypes ?? []
  );

  // Build filter string for Algolia
  const buildFilterString = () => {
    const filters: string[] = ["isVisible:true"];

    if (minPrice !== null) {
      filters.push(`monthlyRent >= ${minPrice}`);
    }
    if (maxPrice !== null) {
      filters.push(`monthlyRent <= ${maxPrice}`);
    }
    if (minBedrooms !== null) {
      filters.push(`numBedrooms >= ${minBedrooms}`);
    }
    if (minBathrooms !== null) {
      filters.push(`numBathrooms >= ${minBathrooms}`);
    }
    if (selectedPropertyTypes.length > 0) {
      const typeFilter = selectedPropertyTypes
        .map((type) => `propertyType:"${type}"`)
        .join(" OR ");
      filters.push(`(${typeFilter})`);
    }

    return filters.join(" AND ");
  };

  // Apply filters to Algolia
  useConfigure({
    filters: buildFilterString(),
    hitsPerPage: 20,
  });

  // Get current search query for tracking
  const { query } = useSearchBox();

  // Track search button click
  const handleSearchClick = () => {
    posthog.capture("search_performed", {
      search_query: query?.trim() ?? "",
      query_length: query?.trim().length ?? 0,
      filters: {
        min_price: minPrice,
        max_price: maxPrice,
        min_bedrooms: minBedrooms,
        min_bathrooms: minBathrooms,
        property_types: selectedPropertyTypes,
      },
      filter_count: [
        minPrice !== null || maxPrice !== null,
        minBedrooms !== null,
        minBathrooms !== null,
        selectedPropertyTypes.length > 0,
      ].filter(Boolean).length,
    });
  };

  // Count active filters
  const activeFilterCount = [
    minPrice !== null || maxPrice !== null,
    minBedrooms !== null,
    minBathrooms !== null,
    selectedPropertyTypes.length > 0,
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setMinPrice(null);
    setMaxPrice(null);
    setMinBedrooms(null);
    setMinBathrooms(null);
    setSelectedPropertyTypes([]);
  };

  // Get display label for price filter button
  const getPriceLabel = () => {
    if (minPrice === null && maxPrice === null) return "Price";
    if (minPrice === null && maxPrice !== null) return `Under $${maxPrice.toLocaleString()}`;
    if (minPrice !== null && maxPrice === null) return `$${minPrice.toLocaleString()}+`;
    return `$${minPrice?.toLocaleString()} - $${maxPrice?.toLocaleString()}`;
  };

  // Get display label for beds filter button
  const getBedsLabel = () => {
    if (minBedrooms === null) return "Beds";
    return `${minBedrooms}+ Beds`;
  };

  // Get display label for baths filter button
  const getBathsLabel = () => {
    if (minBathrooms === null) return "Baths";
    return `${minBathrooms}+ Baths`;
  };

  // Get display label for property type filter button
  const getPropertyTypeLabel = () => {
    if (selectedPropertyTypes.length === 0) return "Home Type";
    if (selectedPropertyTypes.length === 1) {
      const type = PROPERTY_TYPES.find((t) => t.value === selectedPropertyTypes[0]);
      return type?.label ?? "Home Type";
    }
    return `${selectedPropertyTypes.length} Types`;
  };

  // Toggle property type selection
  const togglePropertyType = (type: string) => {
    setSelectedPropertyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Price Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={minPrice !== null || maxPrice !== null ? "default" : "outline"}
            className="h-12 gap-1 text-base"
          >
            {getPriceLabel()}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="space-y-4">
            <div className="font-medium">Price Range</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Min</label>
                <input
                  type="number"
                  placeholder="No min"
                  value={minPrice ?? ""}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Max</label>
                <input
                  type="number"
                  placeholder="No max"
                  value={maxPrice ?? ""}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.label}
                  onClick={() => {
                    setMinPrice(range.min);
                    setMaxPrice(range.max);
                    posthog.capture("search_filter_selected", {
                      filter_type: "price",
                      min_price: range.min,
                      max_price: range.max,
                    });
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    minPrice === range.min && maxPrice === range.max
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Beds Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={minBedrooms !== null ? "default" : "outline"}
            className="h-12 gap-1 text-base"
          >
            {getBedsLabel()}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-4" align="start">
          <div className="space-y-3">
            <div className="font-medium">Bedrooms</div>
            <div className="flex flex-wrap gap-2">
              {BEDROOM_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => {
                    setMinBedrooms(option.value);
                    posthog.capture("search_filter_selected", {
                      filter_type: "bedrooms",
                      min_bedrooms: option.value,
                    });
                  }}
                  className={`min-w-[48px] rounded-full border px-3 py-2 text-sm transition-colors ${
                    minBedrooms === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Baths Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={minBathrooms !== null ? "default" : "outline"}
            className="h-12 gap-1 text-base"
          >
            {getBathsLabel()}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-4" align="start">
          <div className="space-y-3">
            <div className="font-medium">Bathrooms</div>
            <div className="flex flex-wrap gap-2">
              {BATHROOM_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => {
                    setMinBathrooms(option.value);
                    posthog.capture("search_filter_selected", {
                      filter_type: "bathrooms",
                      min_bathrooms: option.value,
                    });
                  }}
                  className={`min-w-[48px] rounded-full border px-3 py-2 text-sm transition-colors ${
                    minBathrooms === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Home Type Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPropertyTypes.length > 0 ? "default" : "outline"}
            className="h-12 gap-1 text-base"
          >
            {getPropertyTypeLabel()}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-4" align="start">
          <div className="space-y-3">
            <div className="font-medium">Home Type</div>
            <div className="space-y-2">
              {PROPERTY_TYPES.map((type) => (
                <label
                  key={type.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedPropertyTypes.includes(type.value)}
                    onChange={() => {
                      const isAdding = !selectedPropertyTypes.includes(type.value);
                      togglePropertyType(type.value);
                      posthog.capture("search_filter_selected", {
                        filter_type: "property_type",
                        property_type: type.value,
                        action: isAdding ? "added" : "removed",
                      });
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-12 gap-1 text-base text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Clear ({activeFilterCount})
        </Button>
      )}

      {/* Search Button */}
      <Button className="h-12 gap-2 text-base" onClick={handleSearchClick}>
        <Search className="h-4 w-4" />
        Search
      </Button>
    </div>
  );
}
