"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useHits, useInstantSearch } from "react-instantsearch";
import type { UnitSearchRecord } from "~/lib/algolia";
import { formatCurrency } from "~/lib/currency";

type Hit = UnitSearchRecord & {
  __position: number;
  __queryID?: string;
};

/**
 * Generates a random offset position within a circle around the original coordinates.
 * This hides the exact property location for privacy/safety and prevents overlapping pins.
 * 
 * @param lat - Original latitude
 * @param lng - Original longitude
 * @param radiusMeters - Radius of the circle in meters (default: 200m)
 * @returns New coordinates with random offset
 */
function getRandomOffsetPosition(
  lat: number,
  lng: number,
  radiusMeters: number = 200
): { lat: number; lng: number } {
  // Generate random angle (0 to 2π)
  const randomAngle = Math.random() * 2 * Math.PI;
  
  // Generate random distance within the radius (using square root for uniform distribution)
  const randomDistance = Math.sqrt(Math.random()) * radiusMeters;
  
  // Earth's radius in meters
  const earthRadius = 6371000;
  
  // Calculate offset in degrees
  // Latitude: 1 degree ≈ 111,320 meters
  const latOffset = (randomDistance * Math.cos(randomAngle)) / 111320;
  
  // Longitude: varies by latitude, 1 degree ≈ 111,320 * cos(latitude) meters
  const lngOffset = (randomDistance * Math.sin(randomAngle)) / (111320 * Math.cos(lat * Math.PI / 180));
  
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}

export function SearchMap() {
  const { items: hits } = useHits<Hit>();
  const { status } = useInstantSearch();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Callback ref to initialize map when container is mounted
  const initializeMap = useCallback((container: HTMLDivElement | null) => {
    if (!container) {
      // Cleanup when unmounting
      if (mapInstanceRef.current) {
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        mapInstanceRef.current = null;
        infoWindowRef.current = null;
        setMapReady(false);
      }
      return;
    }

    // Store ref
    (mapContainerRef as React.MutableRefObject<HTMLDivElement>).current = container;

    // Check if Google Maps is loaded
    if (!window.google?.maps) {
      // Need to load the script first
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com/maps/api/js"]'
      );
      
      if (existingScript) {
        // Script exists, wait for it to load
        if (window.google?.maps) {
          createMap(container);
        } else {
          existingScript.addEventListener("load", () => createMap(container));
        }
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMapError("Google Maps API key not configured");
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => createMap(container);
      script.onerror = () => setMapError("Failed to load Google Maps");
      document.head.appendChild(script);
      return;
    }

    createMap(container);
  }, []);

  const createMap = (container: HTMLDivElement) => {
    try {
      // Default center (Cayman Islands)
      const defaultCenter = { lat: 19.3133, lng: -81.2546 };

      mapInstanceRef.current = new google.maps.Map(container, {
        center: defaultCenter,
        zoom: 11,
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      setMapReady(true);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("Failed to initialize map");
    }
  };

  // Update markers when hits change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    if (hits.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    hits.forEach((hit) => {
      if (!hit._geoloc?.lat || !hit._geoloc?.lng) return;

      // Get randomized position within ~200m radius for privacy and to prevent overlapping pins
      const position = getRandomOffsetPosition(hit._geoloc.lat, hit._geoloc.lng, 200);
      bounds.extend(position);

      // Get the formatted price for the marker
      const priceText = formatCurrency(hit.monthlyRent, hit.currency, { compact: true });

      // Create a marker with custom SVG icon showing price inside the bubble
      const priceMarker = new google.maps.Marker({
        map: mapInstanceRef.current,
        position,
        title: hit.propertyName,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="90" height="36">
              <rect x="0" y="0" width="90" height="30" rx="6" fill="white" stroke="#000000" stroke-width="2"/>
              <polygon points="45,30 38,24 52,24" fill="white" stroke="#000000" stroke-width="2"/>
              <rect x="36" y="24" width="18" height="4" fill="white"/>
              <text x="45" y="20" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#000000" text-decoration="none">${priceText}</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(90, 36),
          anchor: new google.maps.Point(45, 36),
        },
      });

      priceMarker.addListener("click", () => {
        if (!infoWindowRef.current || !mapInstanceRef.current) return;

        const imageUrl = hit.imageUrl ?? "/placeholder-property.jpg";
        const content = `
          <div style="width: 280px; font-family: system-ui, sans-serif;">
            <a href="/units/${hit.unitId}" style="text-decoration: none; color: inherit;">
              <div style="position: relative; height: 140px; overflow: hidden; border-radius: 8px 8px 0 0;">
                <img 
                  src="${imageUrl}" 
                  alt="${hit.propertyName}"
                  style="width: 100%; height: 100%; object-fit: cover;"
                  onerror="this.src='/placeholder-property.jpg'"
                />
              </div>
              <div style="padding: 12px;">
                <div style="font-size: 18px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">
                  ${formatCurrency(hit.monthlyRent, hit.currency)}<span style="font-size: 12px; font-weight: 400; color: #64748b;">/month</span>
                </div>
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #0f172a;">
                  ${hit.propertyName}${hit.unitNumber ? ` - Unit ${hit.unitNumber}` : ""}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
                  ${hit.address}
                </div>
                <div style="display: flex; gap: 12px; font-size: 12px; color: #475569;">
                  <span>${hit.numBedrooms} bed${hit.numBedrooms !== 1 ? "s" : ""}</span>
                  <span>${hit.numBathrooms} bath${hit.numBathrooms !== 1 ? "s" : ""}</span>
                  ${hit.squareFeet ? `<span>${hit.squareFeet.toLocaleString()} sq ft</span>` : ""}
                </div>
              </div>
            </a>
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapInstanceRef.current, priceMarker);
      });

      markersRef.current.push(priceMarker);
    });

    // Fit map to show all markers
    if (hits.length > 0 && markersRef.current.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);

      // Don't zoom in too much for single marker
      const listener = google.maps.event.addListener(
        mapInstanceRef.current,
        "idle",
        () => {
          const zoom = mapInstanceRef.current?.getZoom();
          if (zoom && zoom > 15) {
            mapInstanceRef.current?.setZoom(15);
          }
          google.maps.event.removeListener(listener);
        }
      );
    }
  }, [hits, mapReady]);

  if (mapError) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-muted">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">Unable to load map</p>
          <p className="mt-2 text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  if (status === "loading" || status === "stalled") {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-muted">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-muted">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">No properties found</p>
          <p className="mt-2 text-sm">Try adjusting your search or location filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={initializeMap}
        className="h-[600px] w-full rounded-lg border"
        style={{ minHeight: "600px" }}
      />
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {hits.length} propert{hits.length !== 1 ? "ies" : "y"} shown on map
      </div>
    </div>
  );
}
