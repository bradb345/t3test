import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UnitListingForm } from "~/components/UnitListingForm";
import { db } from "~/server/db";
import { properties, units } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export default async function EditUnitPage(
  props: {
    params: Promise<{ id: string; unitId: string }>;
  }
) {
  const params = await props.params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const propertyId = parseInt(params.id);
  const unitId = parseInt(params.unitId);

  // Verify property exists and belongs to user
  const property = await db.query.properties.findFirst({
    where: and(
      eq(properties.id, propertyId),
      eq(properties.userId, userId)
    ),
  });

  if (!property) {
    redirect("/my-properties");
  }
  // Fetch the unit to edit
  const unit = await db.query.units.findFirst({
    where: and(
      eq(units.id, unitId),
      eq(units.propertyId, propertyId)
    ),
  });

  if (!unit) {
    redirect(`/my-properties/${propertyId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-3xl px-4 pt-32 pb-16">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Edit Unit {unit.unitNumber}
          </h1>
          <p className="text-lg text-muted-foreground">
            Update the details for this unit at {property.name}
          </p>
        </div>

        <UnitListingForm 
          propertyId={propertyId} 
          currency={property.currency ?? "USD"}
          initialData={unit}
          mode="edit"
        />
      </div>
    </main>
  );
}
