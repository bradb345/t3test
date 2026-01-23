"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { MapPin, Bed, Bath, Square, Home, ChevronLeft, ChevronRight } from "lucide-react";
import type { UnitSearchRecord } from "~/lib/algolia";
import { formatCurrency } from "~/lib/currency";

interface PropertyListingCardProps {
  unit: UnitSearchRecord;
}

export function PropertyListingCard({ unit }: PropertyListingCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Use imageUrls array if available, fallback to single imageUrl
  const images = unit.imageUrls?.length > 0 
    ? unit.imageUrls 
    : unit.imageUrl 
      ? [unit.imageUrl] 
      : [];

  const hasMultipleImages = images.length > 1;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Link href={`/units/${unit.unitId}`} target="_blank" rel="noopener noreferrer" className="block">
      <article className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg sm:h-[280px] sm:flex-row">
        {/* Image Section - Left side with carousel */}
        <div className="relative h-56 w-full shrink-0 bg-muted sm:h-full sm:w-[380px]">
          {images.length > 0 ? (
            <>
              <Image
                src={images[currentImageIndex]!}
                alt={`${unit.propertyName} - Image ${currentImageIndex + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 380px"
              />
              
              {/* Navigation arrows - only show if multiple images */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  
                  {/* Image counter */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Home className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          {/* Reserved for future badges like Sponsored, Featured, etc. */}
        </div>

        {/* Content Section - Right side */}
        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
          {/* Top section: Price and Address */}
          <div>
            {/* Price */}
            <div className="mb-3">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(unit.monthlyRent, unit.currency)}
              </span>
              <span className="text-base text-muted-foreground"> /month</span>
            </div>

            {/* Property name */}
            <h3 className="mb-2 text-xl font-semibold text-foreground group-hover:text-primary">
              {unit.propertyName}
              {unit.unitNumber && (
                <span className="text-muted-foreground"> - Unit {unit.unitNumber}</span>
              )}
            </h3>

            {/* Address */}
            <div className="mb-4 flex items-center gap-1.5 text-base text-muted-foreground">
              <MapPin className="h-5 w-5 shrink-0" />
              <span className="line-clamp-1">{unit.address}</span>
            </div>

            {/* Property features row */}
            <div className="mb-4 flex flex-wrap items-center gap-6 text-base">
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-muted-foreground" />
                <span>{unit.numBedrooms} bed{unit.numBedrooms !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-5 w-5 text-muted-foreground" />
                <span>{unit.numBathrooms} bath{unit.numBathrooms !== 1 ? "s" : ""}</span>
              </div>
              {unit.squareFeet && (
                <div className="flex items-center gap-2">
                  <Square className="h-5 w-5 text-muted-foreground" />
                  <span>{unit.squareFeet.toLocaleString()} sq ft</span>
                </div>
              )}
            </div>

            {/* Description snippet */}
            {unit.description && (
              <p className="line-clamp-2 text-base text-muted-foreground">
                {unit.description}
              </p>
            )}
          </div>

          {/* Bottom section: Features tags - reserved for future use like Sponsored badges */}
          {unit.features && unit.features.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {unit.features.slice(0, 5).map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                  {feature}
                </Badge>
              ))}
              {unit.features.length > 5 && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  +{unit.features.length - 5} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
