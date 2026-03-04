import { sendEmail } from "~/lib/email";
import type { EmailMap } from "~/lib/emails";

import { contactSupportEmail } from "./templates/contact-support";
import { contactConfirmationEmail } from "./templates/contact-confirmation";
import { tenantInvitationEmail } from "./templates/tenant-invitation";
import { onboardingCompleteEmail } from "./templates/onboarding-complete";
import { welcomeEmail } from "./templates/welcome";
import { propertyInquiryEmail } from "./templates/property-inquiry";
import { noticeGivenEmail } from "./templates/notice-given";
import { applicationApprovedEmail } from "./templates/application-approved";
import { applicationRejectedEmail } from "./templates/application-rejected";
import { leaseActivatedEmail } from "./templates/lease-activated";
import { paymentReminderEmail } from "./templates/payment-reminder";
import { paymentCompletedEmail } from "./templates/payment-completed";
import { paymentFailedEmail } from "./templates/payment-failed";
import { maintenanceRequestEmail } from "./templates/maintenance-request";
import { maintenanceUpdateEmail } from "./templates/maintenance-update";
import { paymentOverdueEmail } from "./templates/payment-overdue";
import { paymentOverdueLandlordEmail } from "./templates/payment-overdue-landlord";
import { refundInitiatedEmail } from "./templates/refund-initiated";
import { refundCompletedEmail } from "./templates/refund-completed";
import { depositDispositionEmail } from "./templates/deposit-disposition";
import { documentApprovedEmail } from "./templates/document-approved";
import { documentRejectedEmail } from "./templates/document-rejected";
import { leaseRenewalOfferedEmail } from "./templates/lease-renewal-offered";
import { leaseRenewalAcceptedEmail } from "./templates/lease-renewal-accepted";

// ---------------------------------------------------------------------------
// Template registry — maps email name to its builder function.
// ---------------------------------------------------------------------------

const templateBuilders: {
  [K in keyof EmailMap]: (params: EmailMap[K]) => { subject: string; html: string };
} = {
  contact_support: contactSupportEmail,
  contact_confirmation: contactConfirmationEmail,
  tenant_invitation: tenantInvitationEmail,
  onboarding_complete: onboardingCompleteEmail,
  welcome: welcomeEmail,
  property_inquiry: propertyInquiryEmail,
  notice_given: noticeGivenEmail,
  application_approved: applicationApprovedEmail,
  application_rejected: applicationRejectedEmail,
  lease_activated: leaseActivatedEmail,
  payment_reminder: paymentReminderEmail,
  payment_completed: paymentCompletedEmail,
  payment_failed: paymentFailedEmail,
  maintenance_request: maintenanceRequestEmail,
  maintenance_update: maintenanceUpdateEmail,
  payment_overdue: paymentOverdueEmail,
  payment_overdue_landlord: paymentOverdueLandlordEmail,
  refund_initiated: refundInitiatedEmail,
  refund_completed: refundCompletedEmail,
  deposit_disposition: depositDispositionEmail,
  document_approved: documentApprovedEmail,
  document_rejected: documentRejectedEmail,
  lease_renewal_offered: leaseRenewalOfferedEmail,
  lease_renewal_accepted: leaseRenewalAcceptedEmail,
};

/**
 * Send a typed transactional email.
 *
 * Usage:
 * ```ts
 * await sendAppEmail("user@example.com", "welcome", { userName: "Alice", baseUrl });
 * ```
 */
export async function sendAppEmail<E extends keyof EmailMap>(
  to: string | string[],
  emailName: E,
  params: EmailMap[E],
) {
  const builder = templateBuilders[emailName];
  const { subject, html } = builder(params);
  return sendEmail({ to, subject, html });
}
