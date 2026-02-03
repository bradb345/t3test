"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { SignInButton } from "@clerk/nextjs";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import {
  Bed,
  Bath,
  Ruler,
  MapPin,
  Calendar,
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
} from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import {
  ViewingRequestModal,
  ContactLandlordModal,
  TenancyApplicationModal,
  OwnerWarningDialog,
} from "~/components/listing";

interface UnitListingContentProps {
  unit: {
    id: number;
    propertyId: number;
    unitNumber: string;
    description: string | null;
    squareFeet: number | null;
    numBedrooms: number;
    numBathrooms: string | null;
    monthlyRent: string;
    currency: string;
    availableFrom: Date | null;
    features: string | null;
    imageUrls: string | null;
  };
  property: {
    id: number;
    name: string;
    address: string;
    description: string | null;
    latitude: string;
    longitude: string;
    amenities: string | null;
    propertyType: string;
    imageUrls: string | null;
  };
  landlordId: number | null;
  landlordName: string;
  isOwner: boolean;
  isSignedIn: boolean;
  currentUserId: number | null; // Reserved for future use (e.g., checking existing applications)
  currentUserName: string | null;
  currentUserEmail: string | null;
}

export function UnitListingContent({
  unit,
  property,
  landlordId,
  landlordName,
  isOwner,
  isSignedIn,
  currentUserId: _currentUserId,
  currentUserName,
  currentUserEmail,
}: UnitListingContentProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  // Modal states
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [ownerWarningType, setOwnerWarningType] = useState<
    "viewing" | "contact" | "apply" | null
  >(null);

  const handleViewingRequest = () => {
    if (isOwner) {
      setOwnerWarningType("viewing");
      return;
    }
    setShowViewingModal(true);
  };

  const handleContactLandlord = () => {
    if (isOwner) {
      setOwnerWarningType("contact");
      return;
    }
    setShowContactModal(true);
  };

  const handleApplyForTenancy = () => {
    if (isOwner) {
      setOwnerWarningType("apply");
      return;
    }
    setShowApplicationModal(true);
  };

  // Parse and merge images
  let unitImages: string[] = [];
  let propertyImages: string[] = [];
  
  try {
    unitImages = unit.imageUrls ? (JSON.parse(unit.imageUrls) as string[]) : [];
  } catch (error) {
    console.error("Error parsing unit imageUrls:", error);
  }

  try {
    propertyImages = property.imageUrls ? (JSON.parse(property.imageUrls) as string[]) : [];
  } catch (error) {
    console.error("Error parsing property imageUrls:", error);
  }

  const allImages = [...unitImages, ...propertyImages];
  const displayImages = allImages.length > 0 ? allImages : ["/placeholder-property.jpg"];

  // Parse features and amenities
  let features: string[] = [];
  let amenities: string[] = [];

  try {
    features = unit.features ? (JSON.parse(unit.features) as string[]) : [];
  } catch (error) {
    console.error("Error parsing features:", error);
  }

  try {
    amenities = property.amenities ? (JSON.parse(property.amenities) as string[]) : [];
  } catch (error) {
    console.error("Error parsing amenities:", error);
  }

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? displayImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === displayImages.length - 1 ? 0 : prev + 1
    );
  };

  const openLightbox = (index: number) => {
    setLightboxImageIndex(index);
    setIsLightboxOpen(true);
  };

  const handleLightboxPrevious = () => {
    setLightboxImageIndex((prev) => 
      prev === 0 ? displayImages.length - 1 : prev - 1
    );
  };

  const handleLightboxNext = () => {
    setLightboxImageIndex((prev) => 
      prev === displayImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handleLightboxPrevious();
    } else if (e.key === "ArrowRight") {
      handleLightboxNext();
    } else if (e.key === "Escape") {
      setIsLightboxOpen(false);
    }
  };

  // Format availability date
  const availabilityText = unit.availableFrom
    ? `Available from ${new Date(unit.availableFrom).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`
    : "Available now";

  useEffect(() => {
    // Load Google Maps script
    if (typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=drawing`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else if (window.google) {
      setMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (mapLoaded && typeof window !== "undefined" && window.google) {
      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);

      // Create map
      const map = new google.maps.Map(document.getElementById("map")!, {
        center: { lat, lng },
        zoom: 14,
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false,
      });

      // Add circle instead of marker to show approximate area
      new google.maps.Circle({
        map,
        center: { lat, lng },
        radius: 300, // 300 meters radius
        fillColor: "#3b82f6",
        fillOpacity: 0.2,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.6,
        strokeWeight: 2,
      });
    }
  }, [mapLoaded, property.latitude, property.longitude]);

  return (
    <div className="min-h-screen bg-background">
      {/* Image Gallery */}
      <div
        className="relative w-full h-[500px] bg-gray-900 cursor-pointer"
        onClick={() => openLightbox(currentImageIndex)}
      >
        <Image
          src={displayImages[currentImageIndex] ?? "/placeholder-property.jpg"}
          alt={`${property.name} - Unit ${unit.unitNumber}`}
          fill
          className="object-cover"
          priority
        />
        
        {/* Image Navigation */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePreviousImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 dark:bg-white/20 dark:hover:bg-white/30 p-3 rounded-full shadow-lg transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 dark:bg-white/20 dark:hover:bg-white/30 p-3 rounded-full shadow-lg transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-md text-sm z-10">
          {currentImageIndex + 1} / {displayImages.length}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {displayImages.length > 1 && (
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex gap-2 overflow-x-auto">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => openLightbox(index)}
                  className={`relative flex-shrink-0 w-24 h-16 rounded-md overflow-hidden border-2 transition-all ${
                    currentImageIndex === index
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0"
          onKeyDown={handleKeyDown}
        >
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
              aria-label="Close lightbox"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 left-4 z-50 bg-black/60 text-white px-4 py-2 rounded-md text-sm">
              {lightboxImageIndex + 1} / {displayImages.length}
            </div>

            {/* Main Image */}
            <div className="relative w-full h-full flex items-center justify-center p-12">
              <Image
                src={displayImages[lightboxImageIndex] ?? "/placeholder-property.jpg"}
                alt={`${property.name} - Unit ${unit.unitNumber} - Image ${lightboxImageIndex + 1}`}
                fill
                className="object-contain"
                quality={100}
                priority
              />
            </div>

            {/* Navigation Arrows */}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={handleLightboxPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-4 rounded-full transition-colors z-50"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-8 w-8 text-white" />
                </button>
                <button
                  onClick={handleLightboxNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-4 rounded-full transition-colors z-50"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-8 w-8 text-white" />
                </button>
              </>
            )}

            {/* Thumbnail Strip */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[90vw]">
                <div className="flex gap-2 overflow-x-auto pb-2 px-2">
                  {displayImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setLightboxImageIndex(index)}
                      className={`relative flex-shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition-all ${
                        lightboxImageIndex === index
                          ? "border-white ring-2 ring-white/50"
                          : "border-white/30 hover:border-white/60"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-sm">
                  {property.propertyType.replace("-", " ")}
                </Badge>
                <Badge variant="outline" className="text-sm capitalize">
                  Unit {unit.unitNumber}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {property.name} - Unit {unit.unitNumber}
              </h1>
              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{property.address}</span>
              </div>
              <div className="flex items-center gap-6 text-lg">
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(parseFloat(unit.monthlyRent), unit.currency)}
                  <span className="text-base font-normal text-muted-foreground"> pcm</span>
                </div>
              </div>
            </div>

            {/* Key Details */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Property Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Bed className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{unit.numBedrooms}</div>
                    <div className="text-sm text-muted-foreground">Bedrooms</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Bath className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{unit.numBathrooms}</div>
                    <div className="text-sm text-muted-foreground">Bathrooms</div>
                  </div>
                </div>
                {unit.squareFeet && (
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Ruler className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">{unit.squareFeet.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">sq ft</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{availabilityText.split(' from ')[1] ?? 'Now'}</div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Unit Description */}
            {unit.description && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">About This Unit</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {unit.description}
                </p>
              </Card>
            )}

            {/* Property Description */}
            {property.description && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">About {property.name}</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {property.description}
                </p>
              </Card>
            )}

            {/* Features & Amenities */}
            {(features.length > 0 || amenities.length > 0) && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Features & Amenities</h2>
                
                {features.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                      Unit Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-sm capitalize">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {amenities.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                      Property Amenities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {amenities.map((amenity, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-sm capitalize">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Map */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Location</h2>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  {property.address}
                </p>
                <p className="text-xs text-muted-foreground">
                  The map shows the general area. Exact location will be provided after booking.
                </p>
              </div>
              <div id="map" className="w-full h-[400px] rounded-lg overflow-hidden bg-muted" />
            </Card>
          </div>

          {/* Right Column - Contact Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <div className="mb-6">
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(parseFloat(unit.monthlyRent), unit.currency)}
                </div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>

              <div className="space-y-3 mb-6">
                {isSignedIn ? (
                  <>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleViewingRequest}
                    >
                      Request Viewing
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={handleContactLandlord}
                    >
                      Contact Landlord
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      size="lg"
                      onClick={handleApplyForTenancy}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Apply for Tenancy
                    </Button>
                  </>
                ) : (
                  <>
                    <SignInButton mode="modal">
                      <Button className="w-full" size="lg">
                        Request Viewing
                      </Button>
                    </SignInButton>
                    <SignInButton mode="modal">
                      <Button variant="outline" className="w-full" size="lg">
                        Contact Landlord
                      </Button>
                    </SignInButton>
                    <SignInButton mode="modal">
                      <Button variant="secondary" className="w-full" size="lg">
                        <FileText className="mr-2 h-4 w-4" />
                        Apply for Tenancy
                      </Button>
                    </SignInButton>
                  </>
                )}
              </div>

              <div className="border-t pt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Type</span>
                  <span className="font-medium capitalize">{property.propertyType.replace("-", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bedrooms</span>
                  <span className="font-medium">{unit.numBedrooms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bathrooms</span>
                  <span className="font-medium">{unit.numBathrooms}</span>
                </div>
                {unit.squareFeet && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium">{unit.squareFeet.toLocaleString()} sq ft</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <span className="font-medium">{availabilityText}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ViewingRequestModal
        open={showViewingModal}
        onClose={() => setShowViewingModal(false)}
        unitId={unit.id}
        unitNumber={unit.unitNumber}
        propertyName={property.name}
        defaultName={currentUserName}
        defaultEmail={currentUserEmail}
      />

      {landlordId && (
        <ContactLandlordModal
          open={showContactModal}
          onClose={() => setShowContactModal(false)}
          landlordId={landlordId}
          landlordName={landlordName}
          unitId={unit.id}
          unitNumber={unit.unitNumber}
          propertyName={property.name}
        />
      )}

      <TenancyApplicationModal
        open={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        unitId={unit.id}
        unitNumber={unit.unitNumber}
        propertyName={property.name}
        monthlyRent={unit.monthlyRent}
        currency={unit.currency}
        defaultName={currentUserName}
        defaultEmail={currentUserEmail}
      />

      <OwnerWarningDialog
        open={ownerWarningType !== null}
        onClose={() => setOwnerWarningType(null)}
        actionType={ownerWarningType ?? "viewing"}
      />
    </div>
  );
}
