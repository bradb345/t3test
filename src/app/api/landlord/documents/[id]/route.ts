import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import {
  tenantDocuments,
  tenantProfiles,
  leases,
  units,
  properties,
  user,
} from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { hasRole } from "~/lib/roles";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendAppEmail } from "~/lib/emails/server";
import { trackServerEvent } from "~/lib/posthog-events/server";

const documentTypeLabels: Record<string, string> = {
  government_id: "Government ID",
  proof_of_address: "Proof of Address",
  pay_stub: "Pay Stub",
  bank_statement: "Bank Statement",
  proof_of_income: "Proof of Income",
  employment_verification: "Employment Verification",
  reference_letter: "Reference Letter",
  other: "Other Document",
};

export async function PATCH(
  request: NextRequest,
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

    // Get current user's DB record and verify landlord role
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!hasRole(currentUser.roles, "landlord")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get document with ownership chain: document → tenantProfile → user,
    // and verify landlord owns a property with a lease for this tenant
    const [documentData] = await db
      .select({
        document: tenantDocuments,
        tenantProfile: tenantProfiles,
        tenant: user,
      })
      .from(tenantDocuments)
      .innerJoin(
        tenantProfiles,
        eq(tenantProfiles.id, tenantDocuments.tenantProfileId)
      )
      .innerJoin(user, eq(user.id, tenantProfiles.userId))
      .where(eq(tenantDocuments.id, documentId))
      .limit(1);

    if (!documentData) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify landlord owns a property with a lease for this tenant
    const landlordLeases = await db
      .select({
        leaseId: leases.id,
        unitId: units.id,
        propertyId: properties.id,
        propertyName: properties.name,
      })
      .from(leases)
      .innerJoin(units, eq(units.id, leases.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(
        and(
          eq(leases.tenantId, documentData.tenantProfile.userId),
          eq(properties.userId, clerkUserId),
          inArray(leases.status, [
            "active",
            "pending_signature",
            "notice_given",
          ])
        )
      )
      .limit(1);

    if (landlordLeases.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const propertyName = landlordLeases[0]!.propertyName;
    const propertyId = landlordLeases[0]!.propertyId;

    // Parse and validate request body
    const body = (await request.json()) as {
      status: string;
      notes?: string;
    };

    if (!body.status || !["approved", "rejected"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Reject if document is already in the target status
    if (documentData.document.status === body.status) {
      return NextResponse.json(
        { error: `Document is already ${body.status}` },
        { status: 400 }
      );
    }

    // Update the document
    const [updatedDocument] = await db
      .update(tenantDocuments)
      .set({
        status: body.status,
        verifiedAt: new Date(),
        verifiedBy: currentUser.id,
        notes: body.notes?.trim() ? body.notes.trim() : null,
      })
      .where(eq(tenantDocuments.id, documentId))
      .returning();

    const docTypeLabel =
      documentTypeLabels[documentData.document.documentType] ??
      documentData.document.documentType;

    // Send notification to tenant
    const notificationTitle =
      body.status === "approved"
        ? "Document Approved"
        : "Document Needs Attention";
    const notificationMessage =
      body.status === "approved"
        ? `Your ${docTypeLabel} for ${propertyName} has been approved.`
        : `Your ${docTypeLabel} for ${propertyName} has been rejected.${
            body.notes ? ` Reason: ${body.notes}` : ""
          } Please re-upload an updated document.`;

    await createAndEmitNotification({
      userId: documentData.tenantProfile.userId,
      type:
        body.status === "approved"
          ? "document_approved"
          : "document_rejected",
      title: notificationTitle,
      message: notificationMessage,
      data: JSON.stringify({
        documentId,
        documentType: documentData.document.documentType,
        propertyId,
        status: body.status,
      }),
      actionUrl: "/dashboard?tab=documents",
    });

    // Send email notification to tenant
    if (documentData.tenant.email) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const tenantName = `${documentData.tenant.first_name} ${documentData.tenant.last_name}`;

      if (body.status === "approved") {
        await sendAppEmail(documentData.tenant.email, "document_approved", {
          tenantName,
          documentType: docTypeLabel,
          propertyName,
          dashboardUrl: `${baseUrl}/dashboard?tab=documents`,
        });
      } else {
        await sendAppEmail(documentData.tenant.email, "document_rejected", {
          tenantName,
          documentType: docTypeLabel,
          propertyName,
          rejectionNotes: body.notes?.trim(),
          dashboardUrl: `${baseUrl}/dashboard?tab=documents`,
        });
      }
    }

    // Track PostHog event
    await trackServerEvent(clerkUserId, "document_verified", {
      document_id: documentId,
      document_type: documentData.document.documentType,
      property_id: propertyId,
      tenant_user_id: documentData.tenantProfile.userId,
      decision: body.status,
      notes: body.notes?.trim() ? body.notes.trim() : null,
      source: "api",
    });

    return NextResponse.json({ document: updatedDocument });
  } catch (error) {
    console.error("Error updating document status:", error);
    return NextResponse.json(
      { error: "Failed to update document status" },
      { status: 500 }
    );
  }
}
