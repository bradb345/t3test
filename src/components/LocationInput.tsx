"use client";

import { useState, useEffect, useRef } from "react";
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
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const Icon = iconMap[icon];

  // Initialize Google Places Autocomplete Service
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      // Check if script is already loaded
      if (window.google?.maps?.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com/maps/api/js"]'
      );
      
      if (existingScript) {
        // Script exists, wait for it to load
        existingScript.addEventListener("load", () => {
          if (window.google?.maps?.places) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
          }
        });
        return;
      }

      // Load the script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.maps?.places) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
        }
      };
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
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

    if (!newValue.trim()) {
      setPredictions([]);
      setShowDropdown(false);
      onChange(null);
      return;
    }

    // Fetch predictions from Google Places API
    if (autocompleteService.current) {
      void autocompleteService.current.getPlacePredictions(
        { input: newValue },
        (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setShowDropdown(true);
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        }
      );
    }
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
    inputRef.current?.focus();
  };

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
      <Icon className="absolute left-3 top-1/2 z-10 h-15 w-15 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-12 pl-10 pr-10 text-base md:text-lg"
      />
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Dropdown with predictions */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
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
