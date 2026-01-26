import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { tenantDocuments, tenantProfiles, user } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { hasRole } from "~/lib/roles";

// DELETE: Delete a document
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const documentId = parseInt(id, 10);

  if (isNaN(documentId)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  // Verify the document belongs to this tenant
  const [document] = await db
    .select()
    .from(tenantDocuments)
    .where(
      and(
        eq(tenantDocuments.id, documentId),
        eq(tenantDocuments.tenantProfileId, profile.id)
      )
    )
    .limit(1);

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Delete the document record
  await db.delete(tenantDocuments).where(eq(tenantDocuments.id, documentId));

  return NextResponse.json({ success: true });
}
