import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { properties } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { PropertyCard } from "~/components/PropertyCard";

export default async function MyPropertiesPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  const userProperties = await db.query.properties.findMany({
    where: eq(properties.userId, userId),
    orderBy: (properties, { desc }) => [desc(properties.createdAt)],
  });

  console.log("Properties before rendering:", 
    userProperties
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 pt-32 pb-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">My Properties</h1>
          <Link href="/list-property/create">
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
              Add New Property
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {userProperties.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              You haven&apos;t listed any properties yet.
            </p>
          </div>
        )}
      </div>
    </main>
  );
} 