"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PropertyCard } from "~/components/PropertyCard";
import type { PropertyWithUnits } from "~/types/landlord";

interface PropertiesTabProps {
  properties: PropertyWithUnits[];
}

export function PropertiesTab({ properties }: PropertiesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Properties</h2>
          <p className="text-muted-foreground">
            Manage your properties and their units
          </p>
        </div>
        <Button asChild>
          <Link href="/list-property/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-lg font-medium">No properties yet</p>
          <p className="text-sm text-muted-foreground">
            Get started by adding your first property
          </p>
          <Button className="mt-4" asChild>
            <Link href="/list-property/create">
              <Plus className="mr-2 h-4 w-4" />
              Add your first property
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={{
                id: property.id,
                name: property.name,
                address: property.address,
                imageUrls: property.imageUrls,
                propertyType: property.propertyType,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
