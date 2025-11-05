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
    description: text("description"),
    yearBuilt: integer("year_built"),
    totalUnits: integer("total_units").notNull(),
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
    floorPlan: varchar("floor_plan", { length: 50 }),
    squareFeet: integer("square_feet"),
    numBedrooms: integer("num_bedrooms").notNull(),
    numBathrooms: decimal("num_bathrooms").notNull(),
    monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
    deposit: decimal("deposit", { precision: 10, scale: 2 }),
    isAvailable: boolean("is_available").default(true),
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
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
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


