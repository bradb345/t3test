import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UnitListingForm } from "~/components/UnitListingForm";
import { db } from "~/server/db";
import { properties } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export default async function CreateUnitPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  const propertyId = parseInt(params.id);

  // Verify property exists and belongs to user
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
  });

  if (!property) {
    redirect("/my-properties");
  }

  if (property.userId !== userId) {
    redirect("/my-properties");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-3xl px-4 pt-32 pb-16">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Add New Unit
          </h1>
          <p className="text-lg text-muted-foreground">
            Fill out the details below to add a unit to {property.name}
          </p>
        </div>

        <UnitListingForm propertyId={propertyId} currency={property.currency ?? "USD"} />
      </div>
    </main>
  );
}
