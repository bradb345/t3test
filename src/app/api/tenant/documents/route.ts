import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { tenantDocuments, tenantProfiles, user } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { hasRole } from "~/lib/roles";

// GET: List documents for tenant
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user and verify tenant role
  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser || !hasRole(dbUser.roles, "tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get tenant profile
  const [profile] = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, dbUser.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json([]);
  }

  const documents = await db
    .select()
    .from(tenantDocuments)
    .where(eq(tenantDocuments.tenantProfileId, profile.id))
    .orderBy(desc(tenantDocuments.uploadedAt));

  return NextResponse.json(documents);
}

// POST: Upload new document
export async function POST(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.auth_id, clerkUserId))
    .limit(1);

  if (!dbUser || !hasRole(dbUser.roles, "tenant")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get tenant profile
  const [profile] = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, dbUser.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json(
      { error: "Tenant profile not found" },
      { status: 400 }
    );
  }

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
  const validTypes = [
    "government_id",
    "proof_of_address",
    "pay_stub",
    "bank_statement",
    "other",
  ];
  if (!validTypes.includes(body.documentType)) {
    return NextResponse.json(
      { error: "Invalid document type" },
      { status: 400 }
    );
  }

  const [newDocument] = await db
    .insert(tenantDocuments)
    .values({
      tenantProfileId: profile.id,
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
