"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { useUploadThing } from "~/utils/uploadthing"
import { Loader2 } from "lucide-react";

export function PropertyListingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    country: "",
    description: "",
    yearBuilt: "",
    totalUnits: "",
    propertyType: "",
    amenities: [] as string[],
    parkingAvailable: false,
    imageUrls: [] as string[],
  });

  const { startUpload } = useUploadThing("imageUploader");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedImages = await startUpload(Array.from(files));
      if (!uploadedImages) return;

      setFormData(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedImages.map(img => img.url)]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('formData:', formData)
      const propertyData = {
        ...formData,
        totalUnits: formData.totalUnits || "1",
        country: formData.country || "US",
        parkingAvailable: Boolean(formData.parkingAvailable),
        amenities: formData.amenities || [],
      };

      console.log("Submitting property with images:", propertyData);

      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(propertyData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      router.push("/my-properties");
      router.refresh();
    } catch (error) {
      console.error("Error creating property:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {currentStep === 1 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Property Name
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Sunset Towers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Address
              </label>
              <Input
                required
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full property address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Property Type
              </label>
              <select
                required
                value={formData.propertyType}
                onChange={(e) => setFormData(prev => ({ ...prev, propertyType: e.target.value }))}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select type</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setCurrentStep(2)}>
              Next
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Property Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm min-h-[100px]"
                placeholder="Describe your property..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Images
              </label>
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
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Uploading images...
                  </p>
                </div>
              )}
              {formData.imageUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.imageUrls.map((url, index) => (
                    <div key={url} className="relative group">
                      <Image 
                        src={url} 
                        alt={`Upload ${index + 1}`} 
                        width={80}
                        height={80}
                        className="object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            imageUrls: prev.imageUrls.filter(u => u !== url)
                          }));
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <Button 
                type="submit"
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Listing'
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </form>
  );
} 