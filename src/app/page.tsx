// import { db } from '~/server/db';
import { FeaturedProperties } from "~/components/FeaturedProperties";
import { Testimonials } from "~/components/Testimonials";
import { HomeSearch } from "~/components/HomeSearch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // const users = await db.query.user.findMany({
  //   orderBy: (model, { desc }) => desc(model.id),
  // })

  return (
    <>
      <main className="flex min-h-screen flex-col items-center bg-background">
        <div className="w-full max-w-6xl px-4 pb-16 pt-32">
          {/* Hero Section */}
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Find Your Perfect Home
            </h1>
            <p className="text-lg text-muted-foreground">
              Search through thousands of properties to find your next rental
            </p>
          </div>

          {/* Search Bar */}
          <HomeSearch />

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
