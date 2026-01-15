import { db } from "~/server/db";
import {
  tenantProfiles,
  employmentInfo,
  emergencyContacts,
  tenantDocuments,
  user,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Types for onboarding data structure
interface OnboardingPersonalData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  ssn?: string;
  ssnEncrypted?: string;
  ssnLast4?: string;
}

interface OnboardingEmploymentData {
  employerName?: string;
  employerPhone?: string;
  employerAddress?: string;
  supervisorName?: string;
  employmentType?: string;
  salary?: string;
  workPermit?: string;
}

interface OnboardingEmergencyContactData {
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
}

interface OnboardingDocumentData {
  proofOfAddressFileName?: string;
  proofOfAddressUrl?: string;
  photoIdFileName?: string;
  photoIdUrl?: string;
}

export interface OnboardingData {
  personal?: OnboardingPersonalData;
  employment?: OnboardingEmploymentData;
  proofOfAddress?: OnboardingDocumentData;
  emergencyContact?: OnboardingEmergencyContactData;
  photoId?: OnboardingDocumentData;
}

/**
 * Persist onboarding data to permanent tenant profile tables.
 * Creates or updates the tenant's profile, employment info, emergency contacts, and documents.
 */
export async function persistTenantProfile(
  userId: number,
  onboardingData: OnboardingData
): Promise<{ profileId: number }> {
  const personal = onboardingData.personal;
  const employment = onboardingData.employment;
  const emergencyContact = onboardingData.emergencyContact;
  const proofOfAddress = onboardingData.proofOfAddress;
  const photoId = onboardingData.photoId;

  // Check if tenant already has a profile
  const [existingProfile] = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, userId))
    .limit(1);

  let profileId: number;

  if (existingProfile) {
    // Update existing profile
    profileId = existingProfile.id;

    await db
      .update(tenantProfiles)
      .set({
        dateOfBirth: personal?.dateOfBirth ? new Date(personal.dateOfBirth) : existingProfile.dateOfBirth,
        ssnEncrypted: personal?.ssnEncrypted ?? existingProfile.ssnEncrypted,
        ssnLast4: personal?.ssnLast4 ?? existingProfile.ssnLast4,
        updatedAt: new Date(),
      })
      .where(eq(tenantProfiles.id, profileId));

    // Update user phone if provided
    if (personal?.phone) {
      await db
        .update(user)
        .set({ phone: personal.phone })
        .where(eq(user.id, userId));
    }
  } else {
    // Create new profile
    const [newProfile] = await db
      .insert(tenantProfiles)
      .values({
        userId,
        dateOfBirth: personal?.dateOfBirth ? new Date(personal.dateOfBirth) : null,
        ssnEncrypted: personal?.ssnEncrypted ?? null,
        ssnLast4: personal?.ssnLast4 ?? null,
      })
      .returning();

    if (!newProfile) {
      throw new Error("Failed to create tenant profile");
    }

    profileId = newProfile.id;

    // Update user phone if provided
    if (personal?.phone) {
      await db
        .update(user)
        .set({ phone: personal.phone })
        .where(eq(user.id, userId));
    }
  }

  // Handle employment info
  if (employment?.employerName) {
    // Check for existing employment record
    const [existingEmployment] = await db
      .select()
      .from(employmentInfo)
      .where(eq(employmentInfo.tenantProfileId, profileId))
      .limit(1);

    // Parse salary - remove $ and commas, convert to number
    const parsedSalary = employment.salary
      ? parseFloat(employment.salary.replace(/[$,]/g, "")) * 12 // Convert monthly to annual
      : 0;

    // Map employment type from form to database value
    const employmentTypeMap: Record<string, string> = {
      full_time: "full_time",
      part_time: "part_time",
      contract: "contract",
      self_employed: "self_employed",
    };
    const dbEmploymentType = employment.employmentType
      ? employmentTypeMap[employment.employmentType] ?? "full_time"
      : "full_time";

    if (existingEmployment) {
      // Update existing employment
      await db
        .update(employmentInfo)
        .set({
          employerName: employment.employerName,
          employerAddress: employment.employerAddress ?? null,
          employerPhone: employment.employerPhone ?? null,
          position: "Not specified", // Not collected in current form
          employmentType: dbEmploymentType,
          annualIncome: parsedSalary.toString(),
          supervisorName: employment.supervisorName ?? null,
          isCurrent: true,
          updatedAt: new Date(),
        })
        .where(eq(employmentInfo.id, existingEmployment.id));
    } else {
      // Create new employment record
      await db.insert(employmentInfo).values({
        tenantProfileId: profileId,
        employerName: employment.employerName,
        employerAddress: employment.employerAddress ?? null,
        employerPhone: employment.employerPhone ?? null,
        position: "Not specified",
        employmentType: dbEmploymentType,
        annualIncome: parsedSalary.toString(),
        supervisorName: employment.supervisorName ?? null,
        isCurrent: true,
      });
    }
  }

  // Handle emergency contact
  if (emergencyContact?.emergencyContactName) {
    // Check for existing primary emergency contact
    const [existingContact] = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.tenantProfileId, profileId))
      .limit(1);

    if (existingContact) {
      // Update existing contact
      await db
        .update(emergencyContacts)
        .set({
          fullName: emergencyContact.emergencyContactName,
          relationship: emergencyContact.emergencyContactRelationship ?? "Not specified",
          phone: emergencyContact.emergencyContactPhone ?? "",
          email: emergencyContact.emergencyContactEmail ?? null,
          isPrimary: true,
          updatedAt: new Date(),
        })
        .where(eq(emergencyContacts.id, existingContact.id));
    } else {
      // Create new emergency contact
      await db.insert(emergencyContacts).values({
        tenantProfileId: profileId,
        fullName: emergencyContact.emergencyContactName,
        relationship: emergencyContact.emergencyContactRelationship ?? "Not specified",
        phone: emergencyContact.emergencyContactPhone ?? "",
        email: emergencyContact.emergencyContactEmail ?? null,
        isPrimary: true,
      });
    }
  }

  // Handle document uploads - proof of address
  if (proofOfAddress?.proofOfAddressUrl) {
    // Check if document already exists
    const [existingDoc] = await db
      .select()
      .from(tenantDocuments)
      .where(eq(tenantDocuments.tenantProfileId, profileId))
      .limit(1);

    const existingProofOfAddress = existingDoc
      ? await db
          .select()
          .from(tenantDocuments)
          .where(eq(tenantDocuments.tenantProfileId, profileId))
          .then((docs) => docs.find((d) => d.documentType === "proof_of_address"))
      : null;

    if (existingProofOfAddress) {
      // Update existing document
      await db
        .update(tenantDocuments)
        .set({
          fileName: proofOfAddress.proofOfAddressFileName ?? "proof_of_address",
          fileUrl: proofOfAddress.proofOfAddressUrl,
          uploadedAt: new Date(),
          status: "pending_review",
        })
        .where(eq(tenantDocuments.id, existingProofOfAddress.id));
    } else {
      // Create new document record
      await db.insert(tenantDocuments).values({
        tenantProfileId: profileId,
        documentType: "proof_of_address",
        fileName: proofOfAddress.proofOfAddressFileName ?? "proof_of_address",
        fileUrl: proofOfAddress.proofOfAddressUrl,
        status: "pending_review",
      });
    }
  }

  // Handle document uploads - photo ID
  if (photoId?.photoIdUrl) {
    const existingPhotoId = await db
      .select()
      .from(tenantDocuments)
      .where(eq(tenantDocuments.tenantProfileId, profileId))
      .then((docs) => docs.find((d) => d.documentType === "government_id"));

    if (existingPhotoId) {
      // Update existing document
      await db
        .update(tenantDocuments)
        .set({
          fileName: photoId.photoIdFileName ?? "photo_id",
          fileUrl: photoId.photoIdUrl,
          uploadedAt: new Date(),
          status: "pending_review",
        })
        .where(eq(tenantDocuments.id, existingPhotoId.id));
    } else {
      // Create new document record
      await db.insert(tenantDocuments).values({
        tenantProfileId: profileId,
        documentType: "government_id",
        fileName: photoId.photoIdFileName ?? "photo_id",
        fileUrl: photoId.photoIdUrl,
        status: "pending_review",
      });
    }
  }

  return { profileId };
}

/**
 * Load existing tenant profile data for pre-populating onboarding forms.
 * Returns data in the same structure as OnboardingData.
 */
export async function loadExistingTenantProfile(
  userId: number
): Promise<OnboardingData | null> {
  // Get tenant profile
  const [profile] = await db
    .select()
    .from(tenantProfiles)
    .where(eq(tenantProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    return null;
  }

  // Get user data for name and email
  const [userData] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  // Get employment info
  const [employment] = await db
    .select()
    .from(employmentInfo)
    .where(eq(employmentInfo.tenantProfileId, profile.id))
    .limit(1);

  // Get emergency contact
  const [emergencyContactData] = await db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.tenantProfileId, profile.id))
    .limit(1);

  // Get documents
  const documents = await db
    .select()
    .from(tenantDocuments)
    .where(eq(tenantDocuments.tenantProfileId, profile.id));

  const proofOfAddressDoc = documents.find((d) => d.documentType === "proof_of_address");
  const photoIdDoc = documents.find((d) => d.documentType === "government_id");

  // Build onboarding data structure
  const onboardingData: OnboardingData = {
    personal: {
      firstName: userData?.first_name,
      lastName: userData?.last_name,
      email: userData?.email,
      phone: userData?.phone ?? undefined,
      dateOfBirth: profile.dateOfBirth
        ? profile.dateOfBirth.toISOString().split("T")[0]
        : undefined,
      // Don't include actual SSN, only masked version
      ssnLast4: profile.ssnLast4 ?? undefined,
    },
  };

  if (employment) {
    // Convert annual income back to monthly for display
    const monthlyIncome = employment.annualIncome
      ? (parseFloat(employment.annualIncome) / 12).toFixed(2)
      : undefined;

    onboardingData.employment = {
      employerName: employment.employerName,
      employerPhone: employment.employerPhone ?? undefined,
      employerAddress: employment.employerAddress ?? undefined,
      supervisorName: employment.supervisorName ?? undefined,
      employmentType: employment.employmentType ?? undefined,
      salary: monthlyIncome ? `$${monthlyIncome}` : undefined,
      workPermit: employment.employmentType === "work_permit" ? "yes" : "no",
    };
  }

  if (emergencyContactData) {
    onboardingData.emergencyContact = {
      emergencyContactName: emergencyContactData.fullName,
      emergencyContactRelationship: emergencyContactData.relationship,
      emergencyContactPhone: emergencyContactData.phone,
      emergencyContactEmail: emergencyContactData.email ?? undefined,
    };
  }

  if (proofOfAddressDoc) {
    onboardingData.proofOfAddress = {
      proofOfAddressFileName: proofOfAddressDoc.fileName,
      proofOfAddressUrl: proofOfAddressDoc.fileUrl,
    };
  }

  if (photoIdDoc) {
    onboardingData.photoId = {
      photoIdFileName: photoIdDoc.fileName,
      photoIdUrl: photoIdDoc.fileUrl,
    };
  }

  return onboardingData;
}
