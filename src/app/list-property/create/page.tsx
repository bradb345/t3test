import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PropertyListingForm } from "~/components/PropertyListingForm";

export default async function CreatePropertyListingPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-3xl px-4 pt-32 pb-16">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            List Your Property
          </h1>
          <p className="text-lg text-muted-foreground">
            Fill out the details below to list your property
          </p>
        </div>

        <PropertyListingForm />
      </div>
    </main>
  );
} 