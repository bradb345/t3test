"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Search } from "lucide-react";
import { LocationInput, type PlaceOption } from "~/components/LocationInput";

// Default fallback location: Cayman Islands (used when no location selected and no geolocation available)
const DEFAULT_FALLBACK_LOCATION: PlaceOption = {
  label: "Cayman Islands",
  value: {
    place_id: "ChIJKaq4Lz6GJY8RXnFwh9PERXA",
    description: "Cayman Islands",
  },
};

interface GeocodingResult {
  formatted_address: string;
  place_id: string;
}

interface ReverseGeocodingResponse {
  status: string;
  results: GeocodingResult[];
}

// Utility to get user's location and convert to a PlaceOption
async function getUserLocationPlace(): Promise<PlaceOption | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&result_type=locality|administrative_area_level_1&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const data = (await response.json()) as ReverseGeocodingResponse;

            if (data.status === "OK" && data.results[0]) {
              const result = data.results[0];
              resolve({
                label: result.formatted_address,
                value: {
                  place_id: result.place_id,
                  description: result.formatted_address,
                },
              });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        })();
      },
      () => {
        // User denied geolocation or error occurred
        resolve(null);
      },
      { timeout: 5000 }
    );
  });
}

export function HomeSearch() {
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
  const [userLocation, setUserLocation] = useState<PlaceOption | null>(null);
  const router = useRouter();

  // Try to get user's location on mount (for future use as default)
  useEffect(() => {
    void (async () => {
      const location = await getUserLocationPlace();
      if (location) {
        setUserLocation(location);
      }
    })();
  }, []);

  // Get the effective location: selected place > user's geolocation > fallback (Cayman Islands)
  const getEffectiveLocation = useCallback((): PlaceOption => {
    if (selectedPlace?.value?.place_id) {
      return selectedPlace;
    }
    if (userLocation?.value?.place_id) {
      return userLocation;
    }
    return DEFAULT_FALLBACK_LOCATION;
  }, [selectedPlace, userLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    // Apply effective location (user selection > geolocation > fallback)
    const effectiveLocation = getEffectiveLocation();
    if (effectiveLocation.value.place_id) {
      params.set("placeId", effectiveLocation.value.place_id);
      params.set("placeName", effectiveLocation.label);
    }
    
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-2">
      <LocationInput
        value={selectedPlace}
        onChange={setSelectedPlace}
        placeholder="Search by city, neighborhood, or address..."
        icon="search"
        className="flex-1"
      />
      <Button type="submit" className="h-12" size="lg">
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </form>
  );
}
