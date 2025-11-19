import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { properties, units } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { UnitListingContent } from "~/components/UnitListingContent"

export default async function UnitListingPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();
  const unitId = parseInt(params.id);

  // Fetch unit details
  const unit = await db.query.units.findFirst({
    where: eq(units.id, unitId),
  });

  if (!unit) {
    notFound();
  }

  // Fetch associated property
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, unit.propertyId),
  });

  if (!property) {
    notFound();
  }

  // Check if user is the owner OR if the unit is publicly visible
  const isOwner = userId && property.userId === userId;
  if (!unit.isVisible && !isOwner) {
    notFound();
  }

  return <UnitListingContent unit={unit} property={property} />;
}
