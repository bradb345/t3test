import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { tenantInvitations, tenantOnboardingProgress, units, properties, user, notifications, leases } from "~/server/db/schema";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { eq, and, gt } from "drizzle-orm";
import { sendEmail } from "~/lib/email";
import { getOnboardingCompleteEmailHtml, getOnboardingCompleteEmailSubject } from "~/emails/onboarding-complete";
import { encryptSSN } from "~/lib/encryption";
import { addRoleToUserById } from "~/lib/roles";
import { persistTenantProfile, loadExistingTenantProfile, type OnboardingData } from "~/lib/tenant-profile";
import { updateUnitIndex } from "~/lib/algolia";

/**
 * Merges two optional objects, with the second object's properties taking precedence.
 * Returns undefined if both inputs are undefined/null.
 */
function mergeOnboardingSection<T extends Record<string, unknown>>(
  existing: T | undefined | null,
  progress: T | undefined | null
): T | undefined {
  if (!existing && !progress) return undefined;
  return { ...(existing ?? ({} as T)), ...(progress ?? ({} as T)) };
}

// GET /api/onboarding?token=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Find the invitation
    const [invitation] = await db
      .select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.invitationToken, token))
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Check if already accepted - return friendly response with unit info
    if (invitation.status === "accepted" && invitation.acceptedAt) {
      // Get unit and property info for the completed message
      const [unit] = await db
        .select()
        .from(units)
        .where(eq(units.id, invitation.unitId))
        .limit(1);

      let property = null;
      if (unit) {
        const [prop] = await db
          .select()
          .from(properties)
          .where(eq(properties.id, unit.propertyId))
          .limit(1);
        property = prop;
      }

      return NextResponse.json({
        alreadyCompleted: true,
        invitation: {
          id: invitation.id,
          tenantName: invitation.tenantName,
          tenantEmail: invitation.tenantEmail,
          acceptedAt: invitation.acceptedAt,
        },
        unit: unit ? {
          id: unit.id,
          unitNumber: unit.unitNumber,
        } : null,
        property: property ? {
          id: property.id,
          name: property.name,
          address: property.address,
        } : null,
      });
    }

    // Get onboarding progress
    const [progress] = await db
      .select()
      .from(tenantOnboardingProgress)
      .where(eq(tenantOnboardingProgress.invitationId, invitation.id))
      .limit(1);

    if (!progress) {
      return NextResponse.json(
        { error: "Onboarding progress not found" },
        { status: 404 }
      );
    }

    // Parse stored data
    const completedSteps = progress.completedSteps
      ? (JSON.parse(progress.completedSteps) as string[])
      : [];
    let data = progress.data
      ? (JSON.parse(progress.data) as Record<string, unknown>)
      : {};

    // Pre-populate with existing tenant profile data if available
    // This allows tenants to reuse their information across multiple rentals
    try {
      let tenantUserId = invitation.tenantUserId;

      // If no tenantUserId is set, look up the user by invitation email
      if (!tenantUserId) {
        const [existingUser] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, invitation.tenantEmail))
          .limit(1);
        tenantUserId = existingUser?.id ?? null;
      }

      if (tenantUserId) {
        const existingProfile = await loadExistingTenantProfile(tenantUserId);
        if (existingProfile) {
          // Merge existing profile with saved onboarding progress
          // Saved progress takes precedence (allows tenant to update info)
          const progressData = data as Partial<OnboardingData>;
          data = {
            personal: mergeOnboardingSection(existingProfile.personal, progressData.personal),
            employment: mergeOnboardingSection(existingProfile.employment, progressData.employment),
            proofOfAddress: mergeOnboardingSection(existingProfile.proofOfAddress, progressData.proofOfAddress),
            emergencyContact: mergeOnboardingSection(existingProfile.emergencyContact, progressData.emergencyContact),
            photoId: mergeOnboardingSection(existingProfile.photoId, progressData.photoId),
          };

          // Persist merged data back to progress so subsequent PATCH calls retain it
          await db
            .update(tenantOnboardingProgress)
            .set({
              data: JSON.stringify(data),
              updatedAt: new Date(),
            })
            .where(eq(tenantOnboardingProgress.id, progress.id));
        }
      }
    } catch (profileError) {
      console.error("Error loading existing tenant profile:", profileError);
      // Continue with saved progress data if profile load fails
    }

    // Return masked SSN for security (only last 4 digits)
    // Never return the encrypted or decrypted full SSN to the client
    if (data.personal && typeof data.personal === 'object') {
      const personal = data.personal as Record<string, unknown>;
      if (personal.ssnLast4 && typeof personal.ssnLast4 === 'string') {
        // Replace with masked version using last 4 digits
        personal.ssn = `***-**-${personal.ssnLast4}`;
        // Remove encrypted data from response
        delete personal.ssnEncrypted;
        delete personal.ssnLast4;
      }
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        unitId: invitation.unitId,
        tenantEmail: invitation.tenantEmail,
        tenantName: invitation.tenantName,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        isExistingTenant: invitation.isExistingTenant,
        hasExistingProfile: invitation.tenantUserId !== null,
      },
      progress: {
        id: progress.id,
        currentStep: progress.currentStep,
        completedSteps,
        status: progress.status,
        data,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/onboarding?token=xxx
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Find the invitation
    const [invitation] = await db
      .select()
      .from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.invitationToken, token),
          gt(tenantInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = (await request.json()) as {
      step?: number;
      stepData?: Record<string, unknown>;
      completedStep?: string;
      status?: string;
    };

    // Get current progress
    const [currentProgress] = await db
      .select()
      .from(tenantOnboardingProgress)
      .where(eq(tenantOnboardingProgress.invitationId, invitation.id))
      .limit(1);

    if (!currentProgress) {
      return NextResponse.json(
        { error: "Onboarding progress not found" },
        { status: 404 }
      );
    }

    // Parse existing data
    const existingData = currentProgress.data
      ? (JSON.parse(currentProgress.data) as Record<string, unknown>)
      : {};
    const existingCompletedSteps = currentProgress.completedSteps
      ? (JSON.parse(currentProgress.completedSteps) as string[])
      : [];

    // Encrypt SSN if present in personal info before storing
    let processedStepData = body.stepData;
    if (body.stepData?.personal && typeof body.stepData.personal === 'object') {
      const personal = body.stepData.personal as Record<string, unknown>;
      if (personal.ssn && typeof personal.ssn === 'string') {
        // Validate and clean SSN
        const cleanSSN = personal.ssn.replace(/[^0-9]/g, '');
        
        // Validate SSN has exactly 9 digits
        if (cleanSSN.length !== 9) {
          return NextResponse.json(
            { error: "Invalid SSN format. SSN must contain exactly 9 digits." },
            { status: 400 }
          );
        }
        
        // Encrypt SSN and store encrypted version
        const encryptedSSN = encryptSSN(personal.ssn);
        const last4 = cleanSSN.slice(-4);
        
        // Remove plaintext SSN from personal data
        const { ssn, ...personalWithoutSSN } = personal;
        
        processedStepData = {
          ...body.stepData,
          personal: {
            ...personalWithoutSSN,
            ssnEncrypted: encryptedSSN,
            ssnLast4: last4,
          },
        };
      }
    }

    // Merge new step data with existing data
    const updatedData = {
      ...existingData,
      ...(processedStepData ?? {}),
    };

    // Add completed step if provided
    let updatedCompletedSteps = existingCompletedSteps;
    if (body.completedStep && !existingCompletedSteps.includes(body.completedStep)) {
      updatedCompletedSteps = [...existingCompletedSteps, body.completedStep];
    }

    // Determine new status
    let newStatus = body.status ?? currentProgress.status;
    let completedAt = currentProgress.completedAt;
    let startedAt = currentProgress.startedAt;

    // Set startedAt if this is the first update
    if (!startedAt && currentProgress.status === "not_started") {
      startedAt = new Date();
      newStatus = "in_progress";
    }

    // Set completedAt if status is completed
    if (newStatus === "completed" && !completedAt) {
      completedAt = new Date();
    }

    // Update progress
    const [updatedProgress] = await db
      .update(tenantOnboardingProgress)
      .set({
        currentStep: body.step ?? currentProgress.currentStep,
        completedSteps: JSON.stringify(updatedCompletedSteps),
        status: newStatus,
        data: JSON.stringify(updatedData),
        startedAt,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(tenantOnboardingProgress.id, currentProgress.id))
      .returning();

    if (!updatedProgress) {
      return NextResponse.json(
        { error: "Failed to update onboarding progress" },
        { status: 404 }
      );
    }

    // Prepare response data with masked SSN
    const responseData = { ...updatedData };
    if (responseData.personal && typeof responseData.personal === 'object') {
      const personal = responseData.personal as Record<string, unknown>;
      if (personal.ssnLast4 && typeof personal.ssnLast4 === 'string') {
        // Replace with masked version using last 4 digits
        personal.ssn = `***-**-${personal.ssnLast4}`;
        // Remove encrypted data from response
        delete personal.ssnEncrypted;
        delete personal.ssnLast4;
      }
    }

    return NextResponse.json({
      success: true,
      progress: {
        id: updatedProgress.id,
        currentStep: updatedProgress.currentStep,
        completedSteps: updatedCompletedSteps,
        status: updatedProgress.status,
        data: responseData,
      },
    });
  } catch (error) {
    console.error("Error updating onboarding progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/onboarding?token=xxx - Complete onboarding and notify landlord
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Parse request body for clerkUserId
    const body = (await request.json()) as {
      clerkUserId?: string;
    };

    // Find the invitation with related data
    const [invitation] = await db
      .select({
        invitation: tenantInvitations,
        unit: units,
        property: properties,
        landlord: user,
      })
      .from(tenantInvitations)
      .innerJoin(units, eq(units.id, tenantInvitations.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(user, eq(user.id, tenantInvitations.landlordId))
      .where(
        and(
          eq(tenantInvitations.invitationToken, token),
          gt(tenantInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    // Get current progress
    const [currentProgress] = await db
      .select()
      .from(tenantOnboardingProgress)
      .where(eq(tenantOnboardingProgress.invitationId, invitation.invitation.id))
      .limit(1);

    if (!currentProgress) {
      return NextResponse.json(
        { error: "Onboarding progress not found" },
        { status: 404 }
      );
    }

    // Find the tenant user by Clerk ID if provided
    let tenantUser = null;
    if (body.clerkUserId) {
      const [foundUser] = await db
        .select()
        .from(user)
        .where(eq(user.auth_id, body.clerkUserId))
        .limit(1);
      tenantUser = foundUser ?? null;
    }

    // If this is an existing tenant, create a lease and attach them to the unit
    if (invitation.invitation.isExistingTenant && tenantUser) {
      // Create a lease for the existing tenant
      // Default to a 1-year lease starting today
      const leaseStart = new Date();
      const leaseEnd = new Date();
      leaseEnd.setFullYear(leaseEnd.getFullYear() + 1);

      await db.insert(leases).values({
        unitId: invitation.unit.id,
        tenantId: tenantUser.id,
        landlordId: invitation.landlord.id,
        leaseStart,
        leaseEnd,
        monthlyRent: invitation.unit.monthlyRent ?? "0",
        securityDeposit: invitation.unit.deposit,
        rentDueDay: invitation.invitation.rentDueDay ?? 1,
        documents: invitation.invitation.leaseDocuments,
        status: "active",
      });

      // Mark the unit as unavailable and hide from search
      await db
        .update(units)
        .set({
          isAvailable: false,
          isVisible: false,
          updatedAt: new Date(),
        })
        .where(eq(units.id, invitation.unit.id));

      // Sync visibility change to Algolia search index
      await updateUnitIndex(invitation.unit.id, {
        isAvailable: false,
        isVisible: false,
      });

      // Update the invitation with the tenant user ID
      await db
        .update(tenantInvitations)
        .set({
          tenantUserId: tenantUser.id,
          updatedAt: new Date(),
        })
        .where(eq(tenantInvitations.id, invitation.invitation.id));

      // Update onboarding progress with tenant user ID
      await db
        .update(tenantOnboardingProgress)
        .set({
          tenantUserId: tenantUser.id,
          updatedAt: new Date(),
        })
        .where(eq(tenantOnboardingProgress.id, currentProgress.id));

      // Assign tenant role to the user
      try {
        await addRoleToUserById(tenantUser.id, "tenant");
      } catch (roleError) {
        console.error("Error assigning tenant role:", roleError);
      }
    }

    // Update progress to completed
    await db
      .update(tenantOnboardingProgress)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantOnboardingProgress.id, currentProgress.id));

    // If we have a tenant user but they weren't an existing tenant (new signup during onboarding),
    // still assign the tenant role
    if (tenantUser && !invitation.invitation.isExistingTenant) {
      try {
        await addRoleToUserById(tenantUser.id, "tenant");
      } catch (roleError) {
        console.error("Error assigning tenant role for new user:", roleError);
      }
    }

    // Update invitation status to accepted
    await db
      .update(tenantInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantInvitations.id, invitation.invitation.id));

    // Persist onboarding data to permanent tenant profile tables
    if (tenantUser) {
      try {
        const onboardingData = currentProgress.data
          ? (JSON.parse(currentProgress.data) as OnboardingData)
          : {};
        await persistTenantProfile(tenantUser.id, onboardingData);
      } catch (profileError) {
        // Log but don't fail - onboarding was successful even if profile persistence fails
        console.error("Error persisting tenant profile:", profileError);
      }

      // Mark the tenant's invitation notification as read
      try {
        await db
          .update(notifications)
          .set({ read: true })
          .where(
            and(
              eq(notifications.userId, tenantUser.id),
              eq(notifications.type, "tenant_invitation")
            )
          );
      } catch (notifError) {
        console.error("Error marking notification as read:", notifError);
      }
    }

    // Create in-app notification for landlord
    const notificationMessage = invitation.invitation.isExistingTenant && tenantUser
      ? `${invitation.invitation.tenantName} has completed their onboarding and has been attached to Unit ${invitation.unit.unitNumber}`
      : `${invitation.invitation.tenantName} has completed their onboarding for Unit ${invitation.unit.unitNumber}`;

    await createAndEmitNotification({
      userId: invitation.landlord.id,
      type: "onboarding_complete",
      title: "Tenant Onboarding Complete",
      message: notificationMessage,
      data: JSON.stringify({
        tenantName: invitation.invitation.tenantName,
        tenantEmail: invitation.invitation.tenantEmail,
        unitId: invitation.unit.id,
        unitNumber: invitation.unit.unitNumber,
        propertyId: invitation.property.id,
        invitationId: invitation.invitation.id,
        isExistingTenant: invitation.invitation.isExistingTenant,
        tenantAttached: invitation.invitation.isExistingTenant && !!tenantUser,
      }),
      actionUrl: `/my-properties/${invitation.property.id}`,
    });

    // Send email notification to landlord
    const landlordEmail = invitation.landlord.email;
    const landlordName = invitation.landlord.first_name ?? "Landlord";
    
    if (landlordEmail) {
      const emailHtml = getOnboardingCompleteEmailHtml({
        landlordName,
        tenantName: invitation.invitation.tenantName,
        tenantEmail: invitation.invitation.tenantEmail,
        unitAddress: invitation.property.address,
        unitNumber: invitation.unit.unitNumber,
        isExistingTenant: invitation.invitation.isExistingTenant,
        tenantAttached: invitation.invitation.isExistingTenant && !!tenantUser,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/my-properties/${invitation.property.id}`,
      });

      await sendEmail({
        to: landlordEmail,
        subject: getOnboardingCompleteEmailSubject(invitation.invitation.tenantName),
        html: emailHtml,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      tenantAttached: invitation.invitation.isExistingTenant && !!tenantUser,
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
