// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  index,
  pgTableCreator,
  serial,
  timestamp,
  varchar,
  boolean,
  integer,
  text,
  decimal,
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `t3test_${name}`);

// Example user data:
/*
{
  id: 1,
  auth_id: "auth0|123456789",
  email: "john.doe@example.com",
  first_name: "John",
  last_name: "Doe",
  image_url: "https://example.com/photos/john.jpg",
  roles: ["tenant", "landlord"],
  phone: "+1-555-123-4567",
  preferredContactMethod: "email",
  notifications: {
    email: true,
    sms: false,
    maintenance: true,
    payments: true
  },
  stripeCustomerId: "cus_1234567890",
  admin: false
}
*/
export const user = createTable(
  "user",
  {
    id: serial("id").primaryKey(),
    auth_id: varchar("auth_id", { length: 256 }).notNull().unique(),
    email: varchar("email", { length: 256 }).notNull(),
    first_name: varchar("first_name", { length: 256 }).notNull(),
    last_name: varchar("last_name", { length: 256 }).notNull(),
    image_url: varchar("image_url", { length: 256 }),
    roles: text("roles"),
    phone: varchar("phone", { length: 20 }),
    preferredContactMethod: varchar("preferred_contact_method", { length: 20 }),
    notifications: text("notifications"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
    admin: boolean("admin").default(false),
  },
  (example) => ({
    nameIndex: index("name_idx").on(example.first_name, example.last_name),
    emailIndex: index("email_idx").on(example.email),
  })
);

// Example property data:
/*
{
  id: 1,
  userId: 42,
  name: "Sunset Towers",
  address: "123 Palm Grove, Bondi Beach, Sydney, NSW 2026",
  country: "AU",
  latitude: -33.89102,
  longitude: 151.27716,
  description: "Luxury beachfront property with ocean views...",
  yearBuilt: 2015,
  totalUnits: 24,
  propertyType: "apartment",
  amenities: ["pool", "gym", "sauna", "parking", "security"],
  parkingAvailable: true,
  imageUrls: [
    "https://example.com/properties/sunset-towers-1.jpg",
    "https://example.com/properties/sunset-towers-2.jpg"
  ]
}
*/
export const properties = createTable(
  "property",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    address: text("address").notNull(),
    country: varchar("country", { length: 2 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KYD"),
    description: text("description"),
    yearBuilt: integer("year_built"),
    totalUnits: integer("total_units"),
    propertyType: varchar("property_type", { length: 50 }).notNull(),
    amenities: text("amenities"),
    parkingAvailable: boolean("parking_available").default(false),
    imageUrls: text("image_urls"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (property) => ({
    geoIndex: index("geo_idx").on(property.latitude, property.longitude),
    countryIndex: index("country_idx").on(property.country),
    ownerIndex: index("owner_idx").on(property.userId),
  })
);

// Example unit data:
/*
{
  id: 1,
  propertyId: 1,
  unitNumber: "4B",
  floorPlan: "2BR+Den",
  squareFeet: 850,
  numBedrooms: 2,
  numBathrooms: 1.5,
  monthlyRent: 2500.00,
  deposit: 5000.00,
  isAvailable: true,
  availableFrom: "2024-04-01T00:00:00Z",
  features: [
    "hardwood floors",
    "renovated kitchen",
    "balcony",
    "ocean view"
  ],
  imageUrls: [
    "https://example.com/units/4b-living.jpg",
    "https://example.com/units/4b-kitchen.jpg"
  ]
}
*/
export const units = createTable(
  "unit",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id),
    unitNumber: varchar("unit_number", { length: 50 }).notNull(),
    description: text("description"),
    floorPlan: text("floor_plan"),
    squareFeet: integer("square_feet"),
    numBedrooms: integer("num_bedrooms").notNull(),
    numBathrooms: decimal("num_bathrooms").notNull(),
    monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
    deposit: decimal("deposit", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    isAvailable: boolean("is_available").default(true),
    isVisible: boolean("is_visible").default(false),
    availableFrom: timestamp("available_from", { withTimezone: true }),
    features: text("features"),
    imageUrls: text("image_urls"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (unit) => ({
    propertyUnitIndex: index("property_unit_idx").on(unit.propertyId, unit.unitNumber),
    availabilityIndex: index("availability_idx").on(unit.isAvailable, unit.availableFrom),
  })
);

// Example lease data:
/*
{
  id: 1,
  unitId: 1,
  tenantId: 42,
  landlordId: 56,
  leaseStart: "2024-01-01T00:00:00Z",
  leaseEnd: "2024-12-31T00:00:00Z",
  monthlyRent: 2500.00,
  securityDeposit: 5000.00,
  status: "active",
  documents: [
    "https://example.com/leases/42-lease.pdf",
    "https://example.com/leases/42-addendum.pdf"
  ],
  terms: {
    petPolicy: "allowed with deposit",
    utilities: "tenant pays electricity and gas",
    parkingSpots: 1
  },
  renewalOption: true,
  autoRenewal: false
}
*/
export const leases = createTable(
  "lease",
  {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => user.id),
    landlordId: integer("landlord_id")
      .notNull()
      .references(() => user.id),
    leaseStart: timestamp("lease_start", { withTimezone: true }).notNull(),
    leaseEnd: timestamp("lease_end", { withTimezone: true }).notNull(),
    monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
    securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    rentDueDay: integer("rent_due_day").notNull().default(1), // Day of month (1-28)
    status: varchar("status", { length: 20 }).notNull().default('active'),
    documents: text("documents"),
    terms: text("terms"),
    renewalOption: boolean("renewal_option").default(false),
    autoRenewal: boolean("auto_renewal").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (lease) => ({
    unitLeaseIndex: index("unit_lease_idx").on(lease.unitId),
    tenantLeaseIndex: index("tenant_lease_idx").on(lease.tenantId),
    landlordLeaseIndex: index("landlord_lease_idx").on(lease.landlordId),
    statusIndex: index("lease_status_idx").on(lease.status),
  })
);

// Example maintenance request data:
/*
{
  id: 1,
  unitId: 1,
  requestedBy: 42,
  assignedTo: 56,
  category: "plumbing",
  priority: "high",
  status: "in_progress",
  title: "Leaking faucet in kitchen",
  description: "Kitchen sink faucet is dripping constantly...",
  imageUrls: [
    "https://example.com/maintenance/leak-1.jpg",
    "https://example.com/maintenance/leak-2.jpg"
  ],
  scheduledFor: "2024-03-20T14:00:00Z",
  completedAt: null,
  notes: "Parts ordered, scheduled for repair"
}
*/
export const maintenanceRequests = createTable(
  "maintenance_request",
  {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    requestedBy: integer("requested_by")
      .notNull()
      .references(() => user.id),
    assignedTo: integer("assigned_to")
      .references(() => user.id),
    category: varchar("category", { length: 50 }).notNull(),
    priority: varchar("priority", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default('pending'),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description").notNull(),
    imageUrls: text("image_urls"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (request) => ({
    statusIndex: index("status_idx").on(request.status, request.priority),
    unitRequestIndex: index("unit_request_idx").on(request.unitId),
  })
);

// Example payment data:
/*
{
  id: 1,
  tenantId: 42,
  leaseId: 1,  // Required: Links payment to specific lease for tracking and reconciliation
  amount: 2500.00,
  type: "rent",
  status: "completed",
  dueDate: "2024-03-01T00:00:00Z",
  paidAt: "2024-02-28T15:30:00Z",
  paymentMethod: "credit_card",
  transactionId: "pi_3O1234567890",
  notes: "March 2024 rent payment"
}
*/
export const payments = createTable(
  "payment",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => user.id),
    // leaseId is required - every payment must be associated with a lease for proper
    // financial tracking, reconciliation, and audit trail. This enables:
    // - Tracking payment history per lease
    // - Calculating outstanding balances
    // - Generating lease-specific payment reports
    leaseId: integer("lease_id")
      .notNull()
      .references(() => leases.id),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentMethod: varchar("payment_method", { length: 50 }),
    transactionId: varchar("transaction_id", { length: 256 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (payment) => ({
    tenantPaymentIndex: index("tenant_payment_idx").on(payment.tenantId, payment.dueDate),
    statusIndex: index("payment_status_idx").on(payment.status),
    leaseIndex: index("payment_lease_idx").on(payment.leaseId),
  })
);

// Example message data:
/*
{
  id: 1,
  fromUserId: 42,
  toUserId: 56,
  propertyId: 1,
  subject: "Maintenance Request Follow-up",
  content: "Just checking on the status of the kitchen faucet repair...",
  type: "maintenance",
  status: "unread",
  attachments: [
    "https://example.com/messages/photo1.jpg"
  ]
}
*/
export const messages = createTable(
  "message",
  {
    id: serial("id").primaryKey(),
    fromUserId: integer("from_user_id")
      .notNull()
      .references(() => user.id),
    toUserId: integer("to_user_id")
      .notNull()
      .references(() => user.id),
    propertyId: integer("property_id")
      .references(() => properties.id),
    subject: varchar("subject", { length: 256 }).notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default('unread'),
    attachments: text("attachments"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (message) => ({
    userMessageIndex: index("user_message_idx").on(message.toUserId, message.status),
    propertyMessageIndex: index("property_message_idx").on(message.propertyId),
  })
);

// Tenant Onboarding Tables

// Example tenant invitation data:
/*
{
  id: 1,
  unitId: 1,
  landlordId: 56,
  tenantEmail: "john.tenant@example.com",
  tenantName: "John Tenant",
  invitationToken: "abc123xyz789",
  status: "sent",
  sentAt: "2024-03-15T10:30:00Z",
  expiresAt: "2024-04-15T10:30:00Z",
  acceptedAt: null
}
*/
export const tenantInvitations = createTable(
  "tenant_invitation",
  {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    landlordId: integer("landlord_id")
      .notNull()
      .references(() => user.id),
    tenantEmail: varchar("tenant_email", { length: 256 }).notNull(),
    tenantName: varchar("tenant_name", { length: 256 }).notNull(),
    invitationToken: varchar("invitation_token", { length: 256 }).notNull().unique(),
    isExistingTenant: boolean("is_existing_tenant").notNull().default(false),
    rentDueDay: integer("rent_due_day"), // Passed to lease on completion
    leaseDocuments: text("lease_documents"), // JSON array of uploaded document URLs
    status: varchar("status", { length: 20 }).notNull().default('sent'),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    tenantUserId: integer("tenant_user_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (invitation) => ({
    tokenIndex: index("invitation_token_idx").on(invitation.invitationToken),
    emailIndex: index("invitation_email_idx").on(invitation.tenantEmail),
    statusIndex: index("invitation_status_idx").on(invitation.status),
  })
);

// Example tenant onboarding progress data:
/*
{
  id: 1,
  invitationId: 1,
  tenantUserId: 42,
  currentStep: 3,
  completedSteps: ["personal", "contact", "employment"],
  status: "in_progress",
  data: {
    personal: { firstName: "John", lastName: "Tenant", dateOfBirth: "1990-05-15" },
    contact: { phone: "+1-555-123-4567", alternatePhone: "+1-555-987-6543" },
    employment: { employer: "Tech Corp", position: "Software Engineer", salary: 85000 }
  }
}
*/
export const tenantOnboardingProgress = createTable(
  "tenant_onboarding_progress",
  {
    id: serial("id").primaryKey(),
    invitationId: integer("invitation_id")
      .notNull()
      .references(() => tenantInvitations.id),
    tenantUserId: integer("tenant_user_id")
      .references(() => user.id),
    currentStep: integer("current_step").notNull().default(1),
    completedSteps: text("completed_steps"),
    status: varchar("status", { length: 20 }).notNull().default('not_started'),
    data: text("data"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (progress) => ({
    invitationProgressIndex: index("invitation_progress_idx").on(progress.invitationId),
    tenantProgressIndex: index("tenant_progress_idx").on(progress.tenantUserId),
    statusIndex: index("onboarding_status_idx").on(progress.status),
  })
);

// Example tenant profile data:
/*
{
  id: 1,
  userId: 42,
  dateOfBirth: "1990-05-15",
  ssnEncrypted: "base64_iv:base64_authTag:base64_ciphertext",
  ssnLast4: "6789",
  driversLicenseNumber: "D12345678",
  driversLicenseState: "CA",
  maritalStatus: "single",
  numberOfOccupants: 1,
  hasPets: false,
  petDetails: null,
  smokingStatus: "non_smoker",
  vehicleInfo: "2020 Honda Civic, License: ABC123"
}
*/
export const tenantProfiles = createTable(
  "tenant_profile",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => user.id),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
    ssnEncrypted: text("ssn_encrypted"), // Encrypted using AES-256-GCM
    ssnLast4: varchar("ssn_last4", { length: 4 }), // Last 4 digits for display only
    driversLicenseNumber: varchar("drivers_license_number", { length: 50 }),
    driversLicenseState: varchar("drivers_license_state", { length: 2 }),
    maritalStatus: varchar("marital_status", { length: 20 }),
    numberOfOccupants: integer("number_of_occupants"),
    hasPets: boolean("has_pets").default(false),
    petDetails: text("pet_details"),
    smokingStatus: varchar("smoking_status", { length: 20 }),
    vehicleInfo: text("vehicle_info"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (profile) => ({
    userProfileIndex: index("user_profile_idx").on(profile.userId),
  })
);

// Example employment information data:
/*
{
  id: 1,
  tenantProfileId: 1,
  employerName: "Tech Corp",
  employerAddress: "456 Business Blvd, San Francisco, CA 94102",
  employerPhone: "+1-555-999-8888",
  position: "Software Engineer",
  employmentType: "full_time",
  startDate: "2020-06-01",
  annualIncome: 85000.00,
  supervisorName: "Jane Smith",
  supervisorPhone: "+1-555-999-8889",
  supervisorEmail: "jane.smith@techcorp.com"
}
*/
export const employmentInfo = createTable(
  "employment_info",
  {
    id: serial("id").primaryKey(),
    tenantProfileId: integer("tenant_profile_id")
      .notNull()
      .references(() => tenantProfiles.id),
    employerName: varchar("employer_name", { length: 256 }).notNull(),
    employerAddress: text("employer_address"),
    employerPhone: varchar("employer_phone", { length: 20 }),
    position: varchar("position", { length: 256 }).notNull(),
    employmentType: varchar("employment_type", { length: 50 }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    annualIncome: decimal("annual_income", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    supervisorName: varchar("supervisor_name", { length: 256 }),
    supervisorPhone: varchar("supervisor_phone", { length: 20 }),
    supervisorEmail: varchar("supervisor_email", { length: 256 }),
    isCurrent: boolean("is_current").default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (employment) => ({
    tenantEmploymentIndex: index("tenant_employment_idx").on(employment.tenantProfileId),
  })
);

// Example rental history data:
/*
{
  id: 1,
  tenantProfileId: 1,
  address: "789 Oak Street, Los Angeles, CA 90001",
  landlordName: "Property Management Inc.",
  landlordPhone: "+1-555-777-6666",
  landlordEmail: "contact@propertymanagement.com",
  moveInDate: "2018-01-01",
  moveOutDate: "2023-12-31",
  monthlyRent: 1800.00,
  reasonForLeaving: "Job relocation"
}
*/
export const rentalHistory = createTable(
  "rental_history",
  {
    id: serial("id").primaryKey(),
    tenantProfileId: integer("tenant_profile_id")
      .notNull()
      .references(() => tenantProfiles.id),
    address: text("address").notNull(),
    landlordName: varchar("landlord_name", { length: 256 }).notNull(),
    landlordPhone: varchar("landlord_phone", { length: 20 }),
    landlordEmail: varchar("landlord_email", { length: 256 }),
    moveInDate: timestamp("move_in_date", { withTimezone: true }).notNull(),
    moveOutDate: timestamp("move_out_date", { withTimezone: true }),
    monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    reasonForLeaving: text("reason_for_leaving"),
    isCurrent: boolean("is_current").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (history) => ({
    tenantRentalHistoryIndex: index("tenant_rental_history_idx").on(history.tenantProfileId),
  })
);

// Example references data:
/*
{
  id: 1,
  tenantProfileId: 1,
  referenceType: "personal",
  fullName: "Alice Johnson",
  relationship: "Friend",
  phone: "+1-555-444-3333",
  email: "alice.johnson@example.com",
  yearsKnown: 5,
  canContact: true
}
*/
export const references = createTable(
  "reference",
  {
    id: serial("id").primaryKey(),
    tenantProfileId: integer("tenant_profile_id")
      .notNull()
      .references(() => tenantProfiles.id),
    referenceType: varchar("reference_type", { length: 50 }).notNull(),
    fullName: varchar("full_name", { length: 256 }).notNull(),
    relationship: varchar("relationship", { length: 100 }),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 256 }),
    yearsKnown: integer("years_known"),
    canContact: boolean("can_contact").default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (reference) => ({
    tenantReferenceIndex: index("tenant_reference_idx").on(reference.tenantProfileId),
  })
);

// Example emergency contacts data:
/*
{
  id: 1,
  tenantProfileId: 1,
  fullName: "Mary Tenant",
  relationship: "Mother",
  phone: "+1-555-222-1111",
  alternatePhone: "+1-555-222-1112",
  email: "mary.tenant@example.com",
  address: "321 Family Lane, Sacramento, CA 95814",
  isPrimary: true
}
*/
export const emergencyContacts = createTable(
  "emergency_contact",
  {
    id: serial("id").primaryKey(),
    tenantProfileId: integer("tenant_profile_id")
      .notNull()
      .references(() => tenantProfiles.id),
    fullName: varchar("full_name", { length: 256 }).notNull(),
    relationship: varchar("relationship", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    alternatePhone: varchar("alternate_phone", { length: 20 }),
    email: varchar("email", { length: 256 }),
    address: text("address"),
    isPrimary: boolean("is_primary").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (contact) => ({
    tenantEmergencyContactIndex: index("tenant_emergency_contact_idx").on(contact.tenantProfileId),
  })
);

// Example tenant documents data:
/*
{
  id: 1,
  tenantProfileId: 1,
  documentType: "government_id",
  fileName: "drivers_license.pdf",
  fileUrl: "https://uploadthing.com/f/abc123",
  fileSize: 245678,
  mimeType: "application/pdf",
  uploadedAt: "2024-03-15T14:30:00Z",
  verifiedAt: null,
  verifiedBy: null,
  status: "pending_review"
}
*/
export const tenantDocuments = createTable(
  "tenant_document",
  {
    id: serial("id").primaryKey(),
    tenantProfileId: integer("tenant_profile_id")
      .notNull()
      .references(() => tenantProfiles.id),
    documentType: varchar("document_type", { length: 50 }).notNull(),
    fileName: varchar("file_name", { length: 256 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: integer("verified_by").references(() => user.id),
    status: varchar("status", { length: 20 }).notNull().default('pending_review'),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (document) => ({
    tenantDocumentIndex: index("tenant_document_idx").on(document.tenantProfileId, document.documentType),
    statusIndex: index("document_status_idx").on(document.status),
  })
);

// Example notification data:
/*
{
  id: 1,
  userId: 42,
  type: "onboarding_complete",
  title: "Tenant Onboarding Complete",
  message: "John Doe has completed their onboarding for Unit 4B",
  data: { tenantName: "John Doe", unitId: 1, invitationId: 5 },
  read: false,
  createdAt: "2024-03-15T14:30:00Z"
}
*/
export const notifications = createTable(
  "notification",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    message: text("message").notNull(),
    data: text("data"), // JSON string for additional data
    read: boolean("read").notNull().default(false),
    actionUrl: text("action_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (notification) => ({
    userNotificationIndex: index("user_notification_idx").on(notification.userId),
    readIndex: index("notification_read_idx").on(notification.userId, notification.read),
  })
);

// Example viewing request data:
/*
{
  id: 1,
  unitId: 1,
  name: "Jane Smith",
  email: "jane.smith@example.com",
  phone: "+1-555-123-4567",
  preferredDate: "2024-04-15T00:00:00Z",
  preferredTime: "2:00 PM",
  message: "I'm interested in viewing this unit. I'm looking for a 2-bedroom apartment...",
  status: "pending",
  landlordNotes: null,
  respondedAt: null
}
*/
export const viewingRequests = createTable(
  "viewing_request",
  {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    name: varchar("name", { length: 256 }).notNull(),
    email: varchar("email", { length: 256 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    preferredDate: timestamp("preferred_date", { withTimezone: true }),
    preferredTime: varchar("preferred_time", { length: 50 }),
    message: text("message"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // status: pending, approved, declined, completed
    landlordNotes: text("landlord_notes"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (request) => ({
    unitIndex: index("viewing_unit_idx").on(request.unitId),
    statusIndex: index("viewing_status_idx").on(request.status),
    emailIndex: index("viewing_email_idx").on(request.email),
  })
);

// Example tenant offboarding notice data:
/*
{
  id: 1,
  leaseId: 1,
  initiatedBy: "landlord",
  initiatedByUserId: 56,
  noticeDate: "2024-03-15T00:00:00Z",
  moveOutDate: "2024-05-15T00:00:00Z",
  reason: "End of lease term",
  status: "active",
  cancelledAt: null,
  cancelledByUserId: null,
  cancellationReason: null,
  inspectionDate: "2024-05-14T10:00:00Z",
  inspectionNotes: "Unit in good condition",
  inspectionCompleted: true,
  depositStatus: "returned",
  depositNotes: "Full deposit returned",
  completedAt: "2024-05-15T14:00:00Z"
}
*/
export const tenantOffboardingNotices = createTable(
  "tenant_offboarding_notice",
  {
    id: serial("id").primaryKey(),
    leaseId: integer("lease_id")
      .notNull()
      .references(() => leases.id),
    initiatedBy: varchar("initiated_by", { length: 20 }).notNull(), // "tenant" | "landlord"
    initiatedByUserId: integer("initiated_by_user_id")
      .notNull()
      .references(() => user.id),
    noticeDate: timestamp("notice_date", { withTimezone: true }).notNull(),
    moveOutDate: timestamp("move_out_date", { withTimezone: true }).notNull(),
    reason: text("reason"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    // Status: active -> cancelled | inspection_scheduled -> completed
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledByUserId: integer("cancelled_by_user_id").references(() => user.id),
    cancellationReason: text("cancellation_reason"),
    inspectionDate: timestamp("inspection_date", { withTimezone: true }),
    inspectionNotes: text("inspection_notes"),
    inspectionCompleted: boolean("inspection_completed").default(false),
    depositStatus: varchar("deposit_status", { length: 20 }).default("pending"),
    // depositStatus: pending -> returned | withheld | partial
    depositNotes: text("deposit_notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (notice) => ({
    leaseIndex: index("offboarding_lease_idx").on(notice.leaseId),
    statusIndex: index("offboarding_notice_status_idx").on(notice.status),
  })
);

