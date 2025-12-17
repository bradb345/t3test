"use client";

import { useState, useEffect, useRef, useId } from "react";
import { Search, MapPin, X, type LucideIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export interface PlaceOption {
  label: string;
  value: {
    place_id?: string;
    description?: string;
  };
}

type IconType = "search" | "map-pin";

interface LocationInputProps {
  value: PlaceOption | null;
  onChange: (place: PlaceOption | null) => void;
  placeholder?: string;
  icon?: IconType;
  className?: string;
}

const iconMap: Record<IconType, LucideIcon> = {
  "search": Search,
  "map-pin": MapPin,
};

interface Prediction {
  description: string;
  place_id: string;
}

// Promise-based script loader - loads once and is shared across all component instances
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  // Return existing promise if script is already loading or loaded
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  // Check if script is already loaded
  if (window.google?.maps?.places) {
    googleMapsPromise = Promise.resolve();
    return googleMapsPromise;
  }

  // Check if script tag already exists
  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[src*="maps.googleapis.com/maps/api/js"]'
  );

  if (existingScript) {
    // Script exists, wait for it to load
    googleMapsPromise = new Promise((resolve, reject) => {
      if (window.google?.maps?.places) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      }
    });
    return googleMapsPromise;
  }

  // Create and load the script
  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps API script"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Search by city, neighborhood, or address...",
  icon = "search",
  className = "w-full",
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value?.label ?? "");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const Icon = iconMap[icon];
  const dropdownId = useId();
  const getOptionId = (index: number) => `${dropdownId}-option-${index}`;

  // Initialize Google Places Autocomplete Service
  useEffect(() => {
    isMounted.current = true;

    loadGoogleMapsScript()
      .then(() => {
        if (isMounted.current && window.google?.maps?.places) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
        }
      })
      .catch((error) => {
        if (isMounted.current) {
          console.error("Failed to load Google Maps:", error);
          setError("Location search unavailable. Please refresh the page.");
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Sync input value when external value changes
  useEffect(() => {
    setInputValue(value?.label ?? "");
  }, [value?.label]);

  // Handle input changes and fetch predictions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);

    // Clear existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (!newValue.trim()) {
      setPredictions([]);
      setShowDropdown(false);
      setError(null);
      onChange(null);
      return;
    }

    // Debounce API call by 300ms
    debounceTimeout.current = setTimeout(() => {
      // Fetch predictions from Google Places API
      if (autocompleteService.current) {
        void autocompleteService.current.getPlacePredictions(
          { input: newValue },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              setPredictions(results);
              setShowDropdown(true);
              setError(null);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              setPredictions([]);
              setShowDropdown(false);
              setError(null);
            } else if (status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              setPredictions([]);
              setShowDropdown(false);
              setError("Location search unavailable. Please check API configuration.");
            } else if (status === window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
              setPredictions([]);
              setShowDropdown(false);
              setError("Location search temporarily unavailable. Please try again later.");
            } else {
              setPredictions([]);
              setShowDropdown(false);
              setError("Unable to search locations. Please try again.");
            }
          }
        );
      } else {
        setError("Location search is loading...");
      }
    }, 300);
  };

  // Handle selecting a prediction
  const handleSelectPrediction = (prediction: Prediction) => {
    const place: PlaceOption = {
      label: prediction.description,
      value: {
        place_id: prediction.place_id,
        description: prediction.description,
      },
    };
    setInputValue(prediction.description);
    onChange(place);
    setPredictions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelectPrediction(predictions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle clear button
  const handleClear = () => {
    setInputValue("");
    onChange(null);
    setPredictions([]);
    setShowDropdown(false);
    setError(null);
    inputRef.current?.focus();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Icon className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-12 pl-10 pr-10 text-base md:text-lg"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={dropdownId}
        aria-expanded={showDropdown && predictions.length > 0}
        aria-activedescendant={selectedIndex >= 0 ? getOptionId(selectedIndex) : undefined}
      />
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear location input"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Dropdown with predictions */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          id={dropdownId}
          role="listbox"
          className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              role="option"
              id={getOptionId(index)}
              data-index={index}
              aria-selected={selectedIndex === index}
              onClick={() => handleSelectPrediction(prediction)}
              className={cn(
                "w-full cursor-pointer px-4 py-2 text-left text-base md:text-lg hover:bg-accent",
                selectedIndex === index && "bg-accent"
              )}
            >
              {prediction.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
