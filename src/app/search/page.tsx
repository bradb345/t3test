import { Suspense } from "react";
import { InstantSearchWrapper } from "./InstantSearchWrapper";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 py-8">
        <Suspense fallback={<SearchResultsSkeleton />}>
          <InstantSearchWrapper />
        </Suspense>
      </div>
    </main>
  );
}

function SearchResultsSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array<undefined>(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 rounded-lg bg-muted" />
            <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
            <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
