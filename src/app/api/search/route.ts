import { NextResponse } from "next/server";
import { searchUnits, type SearchResponse } from "~/lib/algolia";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") ?? "";
    const bedrooms = searchParams.get("bedrooms");
    const maxRent = searchParams.get("maxRent");
    const minRent = searchParams.get("minRent");
    const propertyType = searchParams.get("propertyType");
    const country = searchParams.get("country");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius"); // in meters
    const page = searchParams.get("page");
    const perPage = searchParams.get("perPage");

    // Build filters - only show visible units
    const filters: string[] = ["isVisible:true"];
    
    if (bedrooms) {
      filters.push(`numBedrooms=${bedrooms}`);
    }
    
    if (maxRent) {
      filters.push(`monthlyRent<=${maxRent}`);
    }
    
    if (minRent) {
      filters.push(`monthlyRent>=${minRent}`);
    }
    
    if (propertyType) {
      filters.push(`propertyType:${propertyType}`);
    }
    
    if (country) {
      filters.push(`country:${country}`);
    }

    const results: SearchResponse = await searchUnits(query, {
      filters: filters.join(" AND "),
      aroundLatLng: lat && lng ? `${lat},${lng}` : undefined,
      aroundRadius: radius ? parseInt(radius) : 50000, // 50km default
      page: page ? parseInt(page) : 0,
      hitsPerPage: perPage ? parseInt(perPage) : 20,
    });

    return NextResponse.json({
      hits: results.hits,
      totalHits: results.nbHits,
      page: results.page,
      totalPages: results.nbPages,
      query: results.query,
      processingTimeMS: results.processingTimeMS,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
