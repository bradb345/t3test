import { Testimonials } from "~/components/Testimonials";
import { HowRentrWorks } from "~/components/HowRentrWorks";
import { StartListingButton } from "./StartListingButton";

export default async function ListPropertyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 pb-16 pt-32">
        {/* Hero Section */}
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            List Your Property
          </h1>
          <p className="text-lg text-muted-foreground">
            Reach thousands of potential tenants and manage your rental with
            ease
          </p>
          <div className="pt-4">
            <StartListingButton />
          </div>
        </div>

        {/* How Rentr Works Section */}
        <div className="mt-24">
          <HowRentrWorks />
        </div>

        {/* Property Listing Form Section */}
        <div className="mt-24">{/* Content will go here */}</div>

        {/* Testimonials Section */}
        <div className="mt-24">
          <Testimonials />
        </div>
      </div>
    </main>
  );
}
