// import { db } from '~/server/db';
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Search } from "lucide-react";
import { FeaturedProperties } from '~/components/FeaturedProperties';
import { Testimonials } from '~/components/Testimonials';

export const dynamic = "force-dynamic"

export default async function HomePage() {
  // const users = await db.query.user.findMany({
  //   orderBy: (model, { desc }) => desc(model.id),
  // })

  return (
    <>
      <main className="flex min-h-screen flex-col items-center bg-background">
        <div className="w-full max-w-6xl px-4 pt-32 pb-16">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Find Your Perfect Home
            </h1>
            <p className="text-lg text-muted-foreground">
              Search through thousands of properties to find your next rental
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search for a city, neighborhood, or address..." 
                className="w-full pl-10 h-12"
              />
            </div>
            <Button className="h-12" size="lg">Search</Button>
          </div>

          {/* Featured Properties Section */}
          <div className="mt-16">
            <FeaturedProperties />
          </div>

          {/* Testimonials Section */}
          <div className="mt-32">
            <Testimonials />
          </div>
        </div>
      </main>
    </>
  );
}
