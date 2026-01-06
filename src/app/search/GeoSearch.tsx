"use client";

import { useState, useEffect } from "react";
import { useConfigure } from "react-instantsearch";
import { LocationInput, type PlaceOption } from "~/components/LocationInput";

interface GeometryViewport {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

interface GeocodingResult {
  geometry: {
    location: { lat: number; lng: number };
    viewport: GeometryViewport;
    bounds?: GeometryViewport;
  };
}

interface GeocodingResponse {
  status: string;
  results: GeocodingResult[];
}

// Default location: Cayman Islands
const DEFAULT_LOCATION: PlaceOption = {
  label: "Cayman Islands",
  value: {
    place_id: "ChIJKaq4Lz6GJY8RXnFwh9PERXA",
    description: "Cayman Islands",
  },
};

// Cayman Islands bounding box (pre-computed to avoid initial API call)
const DEFAULT_BOUNDING_BOX = "19.7616,-79.7191,19.2538,-81.4294";

interface GeoSearchProps {
  initialPlaceId?: string;
  initialPlaceName?: string;
}

export function GeoSearch({ initialPlaceId, initialPlaceName }: GeoSearchProps) {
  // Determine initial place based on URL params (which already have defaults applied from HomeSearch)
  const getInitialPlace = (): PlaceOption | null => {
    if (initialPlaceId && initialPlaceName) {
      return {
        label: initialPlaceName,
        value: {
          place_id: initialPlaceId,
          description: initialPlaceName,
        },
      };
    }
    // No default selection on search page - URL params should already have location
    return null;
  };

  // Get initial bounding box based on URL params
  const getInitialBoundingBox = (): string | undefined => {
    if (initialPlaceId === DEFAULT_LOCATION.value.place_id) {
      return DEFAULT_BOUNDING_BOX;
    }
    return undefined;
  };

  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(getInitialPlace);
  const [boundingBox, setBoundingBox] = useState<string | undefined>(getInitialBoundingBox);
  const [searchQuery, setSearchQuery] = useState<string>(initialPlaceName ?? "");

  // Fetch bounding box for initial place from URL params
  useEffect(() => {
    if (initialPlaceId && initialPlaceId !== DEFAULT_LOCATION.value.place_id) {
      void (async () => {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?place_id=${initialPlaceId}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
          );
          const data = (await response.json()) as GeocodingResponse;

          if (data.status === "OK" && data.results[0]) {
            const geometry = data.results[0].geometry;
            const box = geometry.bounds ?? geometry.viewport;

            if (box) {
              const boundingBoxStr = `${box.northeast.lat},${box.northeast.lng},${box.southwest.lat},${box.southwest.lng}`;
              setBoundingBox(boundingBoxStr);
              // Clear the text query once we have the bounding box
              setSearchQuery("");
            }
          } else {
            console.error('[GeoSearch] Geocoding failed:', data.status);
            // Keep using text search if geocoding fails
          }
        } catch (error) {
          console.error("[GeoSearch] Error fetching place details:", error);
          // Keep using text search on error
        }
      })();
    } else if (initialPlaceId === DEFAULT_LOCATION.value.place_id) {
      setBoundingBox(DEFAULT_BOUNDING_BOX);
      setSearchQuery("");
    }
  }, [initialPlaceId]);

  // Use configure to set the bounding box filter and/or search query in Algolia
  useConfigure({
    insideBoundingBox: boundingBox,
    query: searchQuery,
  });

  const handlePlaceSelect = (place: PlaceOption | null) => {
    if (!place?.value?.place_id) {
      // Clear selection - no default forced (user can search without location filter)
      setSelectedPlace(null);
      setBoundingBox(undefined);
      setSearchQuery("");
      return;
    }

    setSelectedPlace(place);

    // If selecting the default location, use pre-computed bounding box
    if (place.value.place_id === DEFAULT_LOCATION.value.place_id) {
      setBoundingBox(DEFAULT_BOUNDING_BOX);
      setSearchQuery("");
      return;
    }

    // Use text search on the location name while fetching bounding box
    setSearchQuery(place.label);
    setBoundingBox(undefined);

    // Get place details including viewport/bounds
    void (async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?place_id=${place.value.place_id}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
        );
        const data = (await response.json()) as GeocodingResponse;

        if (data.status === "OK" && data.results[0]) {
          const geometry = data.results[0].geometry;
          // Prefer bounds over viewport as it's more accurate for regions
          const box = geometry.bounds ?? geometry.viewport;

          if (box) {
            // Algolia insideBoundingBox format: "p1Lat,p1Lng,p2Lat,p2Lng"
            // where p1 and p2 are diagonally opposite corners
            const boundingBoxStr = `${box.northeast.lat},${box.northeast.lng},${box.southwest.lat},${box.southwest.lng}`;
            setBoundingBox(boundingBoxStr);
            // Clear text query once we have the precise bounding box
            setSearchQuery("");
          }
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
        // Keep using text search if geocoding fails
      }
    })();
  };

  return (
    <LocationInput
      value={selectedPlace}
      onChange={handlePlaceSelect}
      placeholder="City or address..."
      icon="map-pin"
      className="w-64"
    />
  );
}


