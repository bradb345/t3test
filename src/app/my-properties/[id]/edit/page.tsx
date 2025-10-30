import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { properties } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { PropertyListingForm } from "~/components/PropertyListingForm";

export default async function EditPropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  // Fetch the property
  const [property] = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.id, parseInt(params.id)),
        eq(properties.userId, userId)
      )
    );

  if (!property) {
    redirect("/my-properties");
  }

  // Parse JSON fields that are stored as strings in the database
  const parsedProperty = {
    ...property,
    id: property.id.toString(),
    latitude: parseFloat(property.latitude),
    longitude: parseFloat(property.longitude),
    description: property.description ?? "",
    yearBuilt: property.yearBuilt ?? "",
    totalUnits: property.totalUnits ?? "",
    parkingAvailable: property.parkingAvailable ?? false,
    amenities: property.amenities ? JSON.parse(property.amenities) as string[] : [],
    imageUrls: property.imageUrls ? JSON.parse(property.imageUrls) as string[] : [],
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-3xl px-4 pt-32 pb-16">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Edit Property
          </h1>
          <p className="text-lg text-muted-foreground">
            Update your property details below
          </p>
        </div>

        <PropertyListingForm initialData={parsedProperty} mode="edit" />
      </div>
    </main>
  );
} 