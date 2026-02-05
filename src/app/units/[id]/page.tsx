import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { properties, units, user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { UnitListingContent } from "~/components/UnitListingContent";

export default async function UnitListingPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const { userId: clerkUserId } = await auth();
  const clerkUser = await currentUser();
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
  const isOwner = clerkUserId && property.userId === clerkUserId;
  if (!unit.isVisible && !isOwner) {
    notFound();
  }

  // Fetch landlord info
  const landlord = await db.query.user.findFirst({
    where: eq(user.auth_id, property.userId),
  });

  // Fetch current user's DB record if signed in
  let currentDbUser = null;
  if (clerkUserId) {
    currentDbUser = await db.query.user.findFirst({
      where: eq(user.auth_id, clerkUserId),
    });
  }

  return (
    <UnitListingContent
      unit={unit}
      property={property}
      landlordId={landlord?.id ?? null}
      landlordName={
        landlord
          ? `${landlord.first_name} ${landlord.last_name}`
          : "Property Owner"
      }
      isOwner={!!isOwner}
      isSignedIn={!!clerkUserId}
      currentUserId={currentDbUser?.id ?? null}
      currentUserName={
        clerkUser
          ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()
          : null
      }
      currentUserEmail={clerkUser?.primaryEmailAddress?.emailAddress ?? null}
    />
  );
}
