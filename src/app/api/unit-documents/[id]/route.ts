import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { unitDocuments, units, properties, user } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { hasRole } from "~/lib/roles";
import { deleteFilesFromUploadThing } from "~/lib/uploadthing";

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = parseInt(params.id);
    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the document
    const [doc] = await db
      .select()
      .from(unitDocuments)
      .where(eq(unitDocuments.id, documentId))
      .limit(1);

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify access: user must be the uploader, or a landlord who owns the property
    let hasAccess = doc.uploadedBy === currentUser.id;

    if (!hasAccess && hasRole(currentUser.roles, "landlord")) {
      const [unitData] = await db
        .select({ unitId: units.id })
        .from(units)
        .innerJoin(properties, eq(properties.id, units.propertyId))
        .where(
          and(eq(units.id, doc.unitId), eq(properties.userId, clerkUserId))
        )
        .limit(1);

      hasAccess = !!unitData;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from UploadThing (best-effort, don't block DB deletion)
    try {
      await deleteFilesFromUploadThing(
        [doc.fileUrl],
        `unit-document-${documentId}`
      );
    } catch (error) {
      console.error("Failed to delete file from UploadThing", {
        error,
        fileUrl: doc.fileUrl,
      });
    }

    // Delete from database
    await db
      .delete(unitDocuments)
      .where(eq(unitDocuments.id, documentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting unit document:", error);
    return NextResponse.json(
      { error: "Failed to delete unit document" },
      { status: 500 }
    );
  }
}
