import { liteClient as algoliasearch } from "algoliasearch/lite";

// Client-side search client (uses search-only API key)
export const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
);

export const UNITS_INDEX = "units";
