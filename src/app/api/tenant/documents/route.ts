import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { tenantDocuments } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { isValidDocumentType } from "~/lib/document-constants";
import { getAuthenticatedTenantWithProfile } from "~/server/auth";

// GET: List documents for tenant
export async function GET() {
  const auth = await getAuthenticatedTenantWithProfile();
  if (auth.error) {
    // If profile not found (400), return empty array instead
    return auth.error.status === 400
      ? NextResponse.json([])
      : auth.error;
  }

  const documents = await db
    .select()
    .from(tenantDocuments)
    .where(eq(tenantDocuments.tenantProfileId, auth.profile.id))
    .orderBy(desc(tenantDocuments.uploadedAt));

  return NextResponse.json(documents);
}

// POST: Upload new document
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedTenantWithProfile();
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    documentType: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  };

  // Validate required fields
  if (!body.documentType?.trim()) {
    return NextResponse.json(
      { error: "Document type is required" },
      { status: 400 }
    );
  }
  if (!body.fileName?.trim()) {
    return NextResponse.json(
      { error: "File name is required" },
      { status: 400 }
    );
  }
  if (!body.fileUrl?.trim()) {
    return NextResponse.json(
      { error: "File URL is required" },
      { status: 400 }
    );
  }

  // Validate document type
  if (!isValidDocumentType(body.documentType)) {
    return NextResponse.json(
      { error: "Invalid document type" },
      { status: 400 }
    );
  }

  const [newDocument] = await db
    .insert(tenantDocuments)
    .values({
      tenantProfileId: auth.profile.id,
      documentType: body.documentType,
      fileName: body.fileName.trim(),
      fileUrl: body.fileUrl.trim(),
      fileSize: body.fileSize ?? null,
      mimeType: body.mimeType ?? null,
      status: "pending_review",
    })
    .returning();

  return NextResponse.json(newDocument, { status: 201 });
}
