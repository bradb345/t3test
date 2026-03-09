/**
 * Centralized email definitions with typed parameters.
 *
 * All transactional emails are defined here so that email names and
 * parameter shapes are enforced at compile time.
 *
 * Send helper: sendAppEmail (import from ~/lib/emails/server)
 */

// ---------------------------------------------------------------------------
// Email parameter types
// ---------------------------------------------------------------------------

export type EmailMap = {
  // Contact / support
  contact_support: {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
  contact_confirmation: {
    name: string;
    subject: string;
    message: string;
  };

  // Tenant invitation & onboarding
  tenant_invitation: {
    tenantName: string;
    landlordName: string;
    unitAddress: string;
    unitNumber: string;
    onboardingUrl: string;
    expiresAt: Date;
  };
  onboarding_complete: {
    landlordName: string;
    tenantName: string;
    tenantEmail: string;
    unitAddress: string;
    unitNumber: string;
    isExistingTenant: boolean;
    tenantAttached?: boolean;
    dashboardUrl: string;
  };
  welcome: {
    userName: string;
    baseUrl: string;
  };

  // Property
  property_inquiry: {
    propertyOwnerName: string;
    propertyAddress: string;
    inquirerName: string;
    inquirerEmail: string;
    message: string;
    baseUrl: string;
  };

  // Offboarding
  notice_given: {
    recipientName: string;
    initiatorName: string;
    initiatedBy: "tenant" | "landlord";
    unitNumber: string;
    propertyAddress: string;
    noticeDate: Date;
    moveOutDate: Date;
    reason?: string;
    dashboardUrl: string;
  };

  // Applications
  application_approved: {
    applicantName: string;
    unitNumber: string;
    propertyName: string;
    monthlyRent: string;
    currency: string;
    dashboardUrl: string;
  };
  application_rejected: {
    applicantName: string;
    unitNumber: string;
    propertyName: string;
    decisionNotes?: string;
  };

  // Lease
  lease_activated: {
    tenantName: string;
    unitNumber: string;
    propertyName: string;
    monthlyRent: string;
    currency: string;
    dashboardUrl: string;
  };

  // Payments
  payment_reminder: {
    tenantName: string;
    amount: string;
    currency: string;
    dueDate: string; // pre-formatted date string
  };
  payment_completed: {
    tenantName: string;
    amount: string;
    currency: string;
    paymentType: string;
  };
  payment_failed: {
    tenantName: string;
    amount: string;
    currency: string;
  };
  payment_overdue: {
    tenantName: string;
    amount: string;
    currency: string;
    dueDate: string;
    gracePeriodDays: number;
  };
  payment_overdue_landlord: {
    landlordName: string;
    tenantName: string;
    amount: string;
    currency: string;
    dueDate: string;
    unitNumber: string;
    propertyName: string;
  };

  // Refunds
  refund_initiated: {
    tenantName: string;
    amount: string;
    currency: string;
    reason?: string;
    deadline: Date;
    dashboardUrl: string;
  };
  refund_completed: {
    recipientName: string;
    amount: string;
    currency: string;
  };
  deposit_disposition: {
    tenantName: string;
    depositAmount: string;
    returnAmount: string;
    currency: string;
    disposition: "returned" | "partial" | "withheld";
    deductions?: string; // JSON string
    dashboardUrl: string;
  };

  // Lease terms
  lease_terms_updated: {
    tenantName: string;
    unitNumber: string;
    propertyName: string;
    currency: string;
    leaseStart: Date;
    leaseEnd: Date;
    monthlyRent: string;
    securityDeposit?: string;
    rentDueDay: number;
    dashboardUrl: string;
  };

  // Lease renewal
  lease_renewal_offered: {
    tenantName: string;
    landlordName: string;
    unitNumber: string;
    propertyName: string;
    currentRent: string;
    newRent: string;
    currency: string;
    newLeaseStart: Date;
    newLeaseEnd: Date;
    notes?: string;
    dashboardUrl: string;
  };
  lease_renewal_accepted: {
    landlordName: string;
    tenantName: string;
    unitNumber: string;
    propertyName: string;
    newRent: string;
    currency: string;
    newLeaseStart: Date;
    newLeaseEnd: Date;
    dashboardUrl: string;
  };

  // Viewing requests
  viewing_request: {
    landlordName: string;
    requesterName: string;
    requesterEmail: string;
    requesterPhone?: string;
    unitNumber: string;
    propertyName: string;
    preferredDate?: string;
    preferredTime?: string;
    message?: string;
    dashboardUrl: string;
  };
  viewing_request_response: {
    requesterName: string;
    unitNumber: string;
    propertyName: string;
    status: "approved" | "declined";
    landlordNotes?: string;
    listingUrl: string;
  };

  // Maintenance
  maintenance_request: {
    landlordName: string;
    tenantName: string;
    title: string;
    category: string;
    priority: string;
    unitNumber: string;
    propertyName: string;
    dashboardUrl: string;
  };
  maintenance_update: {
    tenantName: string;
    title: string;
    newStatus: string;
    notes?: string;
    dashboardUrl: string;
  };
};
