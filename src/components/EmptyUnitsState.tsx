"use client";


import noUnits from "../../public/images/no-units.png";
import Image from "next/image";

interface EmptyUnitsStateProps {
  propertyId: number;
}

export function EmptyUnitsState({ propertyId: _propertyId }: EmptyUnitsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Image src={noUnits} alt="No Units" width={300} height={300} className="mb-6" />

      <h3 className="text-xl font-semibold mb-2">No Units</h3>
      <p className="text-muted-foreground max-w-md">
        Add a unit to start managing your property
      </p>
    </div>
  );
}
