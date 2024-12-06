"use client";

import Image from "next/image";
import Link from "next/link";
import { Card } from "~/components/ui/card";

interface PropertyCardProps {
  property: {
    id: number;
    name: string;
    address: string;
    propertyType: string;
    imageUrls: string | null;
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const imageUrls = JSON.parse(property.imageUrls ?? "[]") as string[];
  const firstImage = imageUrls[0] ?? "/placeholder-property.jpg";

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative">
        <Image
          src={firstImage}
          alt={property.name}
          fill
          className="object-cover"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={(e) => console.error("Image failed to load:", firstImage)}
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{property.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {property.address}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm">
            {property.propertyType.charAt(0).toUpperCase() + 
             property.propertyType.slice(1)}
          </span>
          <Link href={`/my-properties/${property.id}`}>
            <button className="text-sm text-primary">
              View Details
            </button>
          </Link>
        </div>
      </div>
    </Card>
  );
} 