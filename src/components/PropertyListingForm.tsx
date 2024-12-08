"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { useUploadThing } from "~/utils/uploadthing";
import { Loader2 } from "lucide-react";
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { MultiSelect } from "~/components/ui/multi-select";
import { toast } from "sonner";

type GeocodingResponse = {
  results: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }[];
  status: string;
};

const AMENITY_OPTIONS = [
  "Pool",
  "Gym",
  "Parking",
  "Elevator",
  "Security System",
  "Storage",
  "Laundry",
  "Bike Storage",
  "Package Room",
  "Rooftop",
  "Garden",
  "Pet Friendly",
];

interface PropertyListingFormProps {
  initialData?: any; // Type this properly based on your property schema
  mode?: "create" | "edit";
}

interface FormData {
  name: string;
  address: string;
  country: string;
  latitude: number;
  longitude: number;
  description: string;
  yearBuilt: string | number;
  totalUnits: string | number;
  propertyType: string;
  amenities: string[];
  parkingAvailable: boolean;
  imageUrls: string[];
}

export function PropertyListingForm({ initialData, mode = "create" }: PropertyListingFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name ?? "",
    address: initialData?.address ?? "",
    country: initialData?.country ?? "",
    latitude: initialData?.latitude ?? 0,
    longitude: initialData?.longitude ?? 0,
    description: initialData?.description ?? "",
    yearBuilt: initialData?.yearBuilt ?? "",
    totalUnits: initialData?.totalUnits ?? "",
    propertyType: initialData?.propertyType ?? "",
    amenities: initialData?.amenities ? JSON.parse(initialData.amenities) : [],
    parkingAvailable: initialData?.parkingAvailable ?? false,
    imageUrls: initialData?.imageUrls ? JSON.parse(initialData.imageUrls) : [],
  });

  const { startUpload } = useUploadThing("imageUploader");

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<any>(
    mode === "edit" && initialData?.address
      ? { label: initialData.address, value: { description: initialData.address } }
      : null
  );

  const handlePlaceSelect = async (place: any) => {
    if (!place?.value?.place_id) return;

    try {
      // Get place details using the Places API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?place_id=${place.value.place_id}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data: GeocodingResponse = await response.json();

      if (data.status === "OK" && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        const countryComponent = data.results[0].address_components?.find(
          (component) => component.types.includes("country")
        );
        const countryCode = countryComponent?.short_name || "US";

        setFormData(prev => ({
          ...prev,
          address: data.results[0].formatted_address || "",
          country: countryCode,
        }));

        setSelectedPlace(place);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  const getCoordinates = async (
    address: string,
  ): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address,
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
      );

      const data: GeocodingResponse = await response.json();

      if (data.status === "OK" && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error("Error geocoding address:", error);
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedImages = await startUpload(Array.from(files));
      if (!uploadedImages) return;

      setFormData((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedImages.map((img) => img.url)],
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const endpoint = mode === "create" 
        ? "/api/properties" 
        : `/api/properties/${initialData.id}`;
      
      const method = mode === "create" ? "POST" : "PATCH";

      // Prepare the data for submission
      const submitData = {
        ...formData,
        // Convert arrays to strings for storage if in create mode
        amenities: mode === "create" ? JSON.stringify(formData.amenities) : formData.amenities,
        imageUrls: mode === "create" ? JSON.stringify(formData.imageUrls) : formData.imageUrls,
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error("Failed to save property");
      }

      toast.success(
        mode === "create" 
          ? "Property created successfully" 
          : "Property updated successfully"
      );
      router.push("/my-properties");
      router.refresh();
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error("Failed to save property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepOneComplete = () => {
    return (
      formData.name.trim() !== "" &&
      formData.address.trim() !== "" &&
      formData.propertyType !== "" &&
      formData.totalUnits !== ""
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {currentStep === 1 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Property Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Sunset Towers"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Address <span className="text-red-500">*</span>
              </label>
              <GooglePlacesAutocomplete
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                selectProps={{
                  value: selectedPlace,
                  onChange: handlePlaceSelect,
                  placeholder: "Enter address...",
                  className: "w-full",
                  styles: {
                    control: (provided) => ({
                      ...provided,
                      borderRadius: '0.375rem',
                      borderColor: 'hsl(var(--input))',
                      backgroundColor: 'transparent',
                      minHeight: '2.25rem',
                      boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
                    }),
                    input: (provided) => ({
                      ...provided,
                      color: 'inherit',
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'transparent',
                      color: state.isFocused ? 'hsl(var(--accent-foreground))' : 'inherit',
                    }),
                  },
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Total Units <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="1"
                  value={formData.totalUnits}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      totalUnits: e.target.value ? parseInt(e.target.value) : "",
                    }))
                  }
                  placeholder="e.g., 1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Year Built
                </label>
                <Input
                  required
                  type="number"
                  value={formData.yearBuilt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      yearBuilt: e.target.value ? parseInt(e.target.value) : "",
                    }))
                  }
                  placeholder="e.g., 2020"
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.propertyType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    propertyType: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select type</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Amenities <span className="text-red-500">*</span>
              </label>
              <MultiSelect
                options={AMENITY_OPTIONS}
                selected={formData.amenities}
                onChange={(selected) => {
                  setFormData((prev) => ({
                    ...prev,
                    amenities: selected,
                  }));
                }}
                placeholder="Select amenities..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button 
              type="button" 
              onClick={() => setCurrentStep(2)}
              disabled={!isStepOneComplete()}
            >
              Next
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Property Details</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder="Describe your property..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Images</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full"
                disabled={isUploading}
              />
              {isUploading && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Uploading images...
                  </p>
                </div>
              )}
              {formData.imageUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.imageUrls.map((url, index) => (
                    <div key={url} className="group relative">
                      <Image
                        src={url}
                        alt={`Upload ${index + 1}`}
                        width={80}
                        height={80}
                        className="rounded-md object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            imageUrls: prev.imageUrls.filter((u) => u !== url),
                          }));
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                disabled={isSubmitting || isUploading}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "create" ? "Creating..." : "Updating..."}
                  </>
                ) : (
                  mode === "create" ? "Create Listing" : "Update Listing"
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </form>
  );
}
