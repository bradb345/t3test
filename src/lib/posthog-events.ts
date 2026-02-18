/**
 * Centralized PostHog event definitions with typed properties.
 *
 * All analytics events — server and client — are defined here so that
 * event names and property shapes are enforced at compile time.
 *
 * Server helper: trackServerEvent  (import from ~/lib/posthog-events/server)
 * Client helper: trackClientEvent  (import from ~/lib/posthog-events/client)
 */

// ---------------------------------------------------------------------------
// Server-side event types
// ---------------------------------------------------------------------------

export type ServerEventMap = {
  // Auth / user lifecycle
  user_signed_up: { email: string; source: string };

  // Property & unit management
  property_created: {
    property_id: number | undefined;
    property_type: string;
    country: string;
    currency: string;
    has_parking: boolean;
    source: string;
  };
  unit_created: {
    unit_id: number;
    unit_number: string;
    property_id: number;
    monthly_rent: string;
    currency: string;
    bedrooms: number;
    bathrooms: string;
  };

  // Tenant invitation & onboarding
  tenant_invited: {
    unit_id: number;
    property_id: number | null;
    rent_due_day: number | undefined;
    is_existing_tenant: boolean;
  };

  // Stripe Connect
  stripe_connect_initiated: {
    is_test_mode: boolean;
    account_status: string;
  };
  stripe_connect_completed: {
    account_id: string;
  };

  // Payments
  payment_initiated: {
    payment_id: number;
    amount: string;
    currency: string;
    payment_type: string;
    lease_id: number;
  };
  payment_completed: {
    payment_id: number;
    amount: string;
    currency: string;
    payment_type: string;
  };
  payment_failed: {
    payment_id: number;
    amount: string;
    currency: string;
  };

  // Maintenance
  maintenance_request_created: {
    maintenance_request_id: number;
    category: string;
    priority: string;
    unit_id: number;
    property_id: number;
    source: string;
    has_images: boolean;
  };
  maintenance_status_updated: {
    request_id: number;
    old_status: string;
    new_status: string;
  };

  // Viewing requests & applications
  viewing_request_submitted: {
    viewing_request_id: number | undefined;
    unit_id: number;
    property_id: number;
    has_preferred_date: boolean;
    source: string;
  };
  viewing_request_responded: {
    request_id: number;
    response_status: string;
  };
  tenancy_application_submitted: {
    application_id: number | undefined;
    unit_id: number;
    property_id: number;
    monthly_rent: string;
    currency: string;
    source: string;
  };
  application_reviewed: {
    application_id: number;
    decision: string;
    unit_id: number;
    property_id: number;
    applicant_id: number;
    source: string;
  };

  // Offboarding
  notice_given: {
    lease_id: number;
    initiated_by: string;
    move_out_date: string;
  };
  notice_cancelled: {
    lease_id: number;
    notice_id: number;
  };
  offboarding_completed: {
    notice_id: number;
    lease_id: number;
    unit_id: number;
    property_id: number;
    deposit_status: string;
    tenant_role_removed: boolean;
    source: string;
  };

  // Tenant profile & documents
  document_uploaded: {
    document_type: string;
  };
  profile_updated: {
    fields_updated: string[];
  };

  // Messaging & contact
  message_sent: {
    message_id: number | undefined;
    message_type: string;
    has_property_context: boolean;
    source: string;
  };
  contact_form_submitted: {
    subject_category: string;
    source: string;
  };
};

// ---------------------------------------------------------------------------
// Client-side event types
// ---------------------------------------------------------------------------

export type ClientEventMap = {
  // Auth
  user_signed_in: { method: string };
  user_signed_out: { method: string };

  // Listing
  unit_listing_viewed: {
    unit_id: number;
    property_id: number;
    monthly_rent: string;
    currency: string;
  };

  // Payments
  checkout_redirect: { payment_id: number };
  payment_return: { status: string };

  // Onboarding
  onboarding_step_completed: {
    step_id: string;
    step_number: number;
    total_steps: number;
    unit_id: number | undefined;
  };
  onboarding_submitted: {
    unit_id: number | undefined;
    total_steps_completed: number;
  };

  // Search
  search_performed: {
    search_query: string;
    query_length: number;
    filters: {
      min_price: number | null;
      max_price: number | null;
      min_bedrooms: number | null;
      min_bathrooms: number | null;
      property_types: string[];
    };
    filter_count: number;
  };
  search_filter_selected: {
    filter_type: string;
    [key: string]: unknown;
  };
};
