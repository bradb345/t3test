import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { properties, units, leases, maintenanceRequests, user } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { UnitCard } from "~/components/UnitCard";
import { EmptyUnitsState } from "~/components/EmptyUnitsState";

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const propertyId = parseInt(params.id);

  // Fetch property details
  const property = await db.query.properties.findFirst({
    where: and(
      eq(properties.id, propertyId),
      eq(properties.userId, userId)
    ),
  });

  if (!property) {
    redirect("/my-properties");
  }

  // Fetch units for this property
  const propertyUnits = await db.query.units.findMany({
    where: eq(units.propertyId, propertyId),
    orderBy: (units, { asc }) => [asc(units.unitNumber)],
  });

  // For each unit, fetch active lease and maintenance info
  const unitsWithDetails = await Promise.all(
    propertyUnits.map(async (unit) => {
      // Get active lease
      const activeLease = await db.query.leases.findFirst({
        where: and(
          eq(leases.unitId, unit.id),
          eq(leases.status, 'active')
        ),
      });

      // Get tenant info if there's an active lease
      let tenant = null;
      if (activeLease) {
        tenant = await db.query.user.findFirst({
          where: eq(user.id, activeLease.tenantId),
        });
      }

      // Get pending maintenance requests
      const pendingMaintenance = await db.query.maintenanceRequests.findMany({
        where: and(
          eq(maintenanceRequests.unitId, unit.id),
          eq(maintenanceRequests.status, 'pending')
        ),
      });

      return {
        ...unit,
        activeLease: activeLease && tenant ? {
          ...activeLease,
          tenant,
        } : null,
        hasPendingMaintenance: pendingMaintenance.length > 0,
      };
    })
  );

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 pt-8 pb-16">
        {/* Property Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            {property.name}
          </h1>
          <p className="text-muted-foreground">{property.address}</p>
          <p className="text-sm text-muted-foreground capitalize mt-1">
            {property.propertyType}
          </p>
        </div>

        {/* Units Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Units</h2>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent">
              Download
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
              Add New Unit
            </button>
          </div>
        </div>

        {/* Units List or Empty State */}
        {unitsWithDetails.length === 0 ? (
          <EmptyUnitsState propertyId={propertyId} />
        ) : (
          <div className="space-y-4">
            {unitsWithDetails.map((unit) => (
              <UnitCard key={unit.id} unit={unit} propertyId={propertyId} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
