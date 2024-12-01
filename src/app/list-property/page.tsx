import { Testimonials } from "~/components/Testimonials"
import { HowRentrWorks } from "~/components/HowRentrWorks"

export default function ListPropertyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 pt-32 pb-16">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            List Your Property
          </h1>
          <p className="text-lg text-muted-foreground">
            Reach thousands of potential tenants and manage your rental with ease
          </p>
        </div>

        {/* How Rentr Works Section */}
        <div className="mt-24">
          <HowRentrWorks />
        </div>

        {/* Property Listing Form Section */}
        <div className="mt-24">
          {/* Content will go here */}
        </div>

        {/* Testimonials Section */}
        <div className="mt-24">
          <Testimonials />
        </div>
      </div>
    </main>
  )
} 