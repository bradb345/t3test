"use client";

import { useState, useEffect } from "react";
import { useConfigure } from "react-instantsearch";
import { MapPin } from "lucide-react";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";

interface PlaceOption {
  label: string;
  value: {
    place_id?: string;
    description?: string;
  };
}

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

// Impossible bounding box that returns no results - used while loading
// This is a tiny box in the middle of the ocean
const LOADING_BOUNDING_BOX = "0.0001,0.0001,0.0000,0.0000";

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
    // For other places with a placeId, use a loading bounding box until we fetch the real one
    // This prevents showing all results while waiting for the geocoding response
    if (initialPlaceId) {
      return LOADING_BOUNDING_BOX;
    }
    // No place selected - no geo filtering
    return undefined;
  };

  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(getInitialPlace);
  const [boundingBox, setBoundingBox] = useState<string | undefined>(getInitialBoundingBox);

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
            }
          }
        } catch (error) {
          console.error("Error fetching place details:", error);
          // On error, clear the loading bounding box to avoid blocking results indefinitely
          setBoundingBox(undefined);
        }
      })();
    } else if (initialPlaceId === DEFAULT_LOCATION.value.place_id) {
      setBoundingBox(DEFAULT_BOUNDING_BOX);
    }
  }, [initialPlaceId]);

  // Use configure to set the bounding box filter in Algolia
  useConfigure({
    insideBoundingBox: boundingBox,
  });

  const handlePlaceSelect = (place: PlaceOption | null) => {
    if (!place?.value?.place_id) {
      // Clear selection - no default forced (user can search without location filter)
      setSelectedPlace(null);
      setBoundingBox(undefined);
      return;
    }

    setSelectedPlace(place);

    // If selecting the default location, use pre-computed bounding box
    if (place.value.place_id === DEFAULT_LOCATION.value.place_id) {
      setBoundingBox(DEFAULT_BOUNDING_BOX);
      return;
    }

    // Set loading bounding box to prevent showing all results while fetching
    setBoundingBox(LOADING_BOUNDING_BOX);

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
            console.log("Setting bounding box:", boundingBoxStr);
            setBoundingBox(boundingBoxStr);
          }
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
        // On error, clear the bounding box to avoid blocking results indefinitely
        setBoundingBox(undefined);
      }
    })();
  };

  return (
    <div className="relative w-64">
      <MapPin className="absolute left-3 top-3 z-10 h-5 w-5 text-muted-foreground" />
      <GooglePlacesAutocomplete
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        selectProps={{
          value: selectedPlace,
          onChange: handlePlaceSelect,
          placeholder: "City or address...",
          isClearable: true,
          className: "w-full",
          components: {
            DropdownIndicator: () => null,
            IndicatorSeparator: () => null,
          },
          styles: {
            control: (provided) => ({
              ...provided,
              borderRadius: "0.375rem",
              borderColor: "hsl(var(--input))",
              backgroundColor: "transparent",
              minHeight: "3rem",
              height: "3rem",
              paddingLeft: "2rem",
            }),
            input: (provided) => ({
              ...provided,
              color: "inherit",
            }),
            placeholder: (provided) => ({
              ...provided,
              color: "hsl(var(--muted-foreground))",
            }),
            singleValue: (provided) => ({
              ...provided,
              color: "inherit",
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              zIndex: 50,
            }),
            option: (provided, state) => ({
              ...provided,
              backgroundColor: state.isFocused
                ? "hsl(var(--accent))"
                : "transparent",
              color: "inherit",
              cursor: "pointer",
            }),
          },
        }}
        autocompletionRequest={{
          types: ["(regions)"],
        }}
      />
    </div>
  );
}


