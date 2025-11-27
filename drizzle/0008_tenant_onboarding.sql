-- Tenant Onboarding System Database Migration
-- This migration adds all tables required for the tenant onboarding flow

-- Table: tenant_invitations
-- Stores invitation records sent by landlords to tenants
CREATE TABLE IF NOT EXISTS "t3test_tenant_invitation" (
  "id" SERIAL PRIMARY KEY,
  "unit_id" INTEGER NOT NULL REFERENCES "t3test_unit"("id"),
  "landlord_id" INTEGER NOT NULL REFERENCES "t3test_user"("id"),
  "tenant_email" VARCHAR(256) NOT NULL,
  "tenant_name" VARCHAR(256) NOT NULL,
  "invitation_token" VARCHAR(256) NOT NULL UNIQUE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
  "sent_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "accepted_at" TIMESTAMP WITH TIME ZONE,
  "tenant_user_id" INTEGER REFERENCES "t3test_user"("id"),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "invitation_token_idx" ON "t3test_tenant_invitation"("invitation_token");
CREATE INDEX IF NOT EXISTS "invitation_email_idx" ON "t3test_tenant_invitation"("tenant_email");
CREATE INDEX IF NOT EXISTS "invitation_status_idx" ON "t3test_tenant_invitation"("status");

-- Table: tenant_onboarding_progress
-- Tracks tenant progress through the onboarding steps
CREATE TABLE IF NOT EXISTS "t3test_tenant_onboarding_progress" (
  "id" SERIAL PRIMARY KEY,
  "invitation_id" INTEGER NOT NULL REFERENCES "t3test_tenant_invitation"("id"),
  "tenant_user_id" INTEGER REFERENCES "t3test_user"("id"),
  "current_step" INTEGER NOT NULL DEFAULT 1,
  "completed_steps" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'not_started',
  "data" TEXT,
  "started_at" TIMESTAMP WITH TIME ZONE,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "invitation_progress_idx" ON "t3test_tenant_onboarding_progress"("invitation_id");
CREATE INDEX IF NOT EXISTS "tenant_progress_idx" ON "t3test_tenant_onboarding_progress"("tenant_user_id");
CREATE INDEX IF NOT EXISTS "onboarding_status_idx" ON "t3test_tenant_onboarding_progress"("status");

-- Table: tenant_profiles
-- Stores tenant personal information
CREATE TABLE IF NOT EXISTS "t3test_tenant_profile" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE REFERENCES "t3test_user"("id"),
  "date_of_birth" TIMESTAMP WITH TIME ZONE,
  "ssn" VARCHAR(256), -- Should be encrypted
  "drivers_license_number" VARCHAR(50),
  "drivers_license_state" VARCHAR(2),
  "marital_status" VARCHAR(20),
  "number_of_occupants" INTEGER,
  "has_pets" BOOLEAN DEFAULT FALSE,
  "pet_details" TEXT,
  "smoking_status" VARCHAR(20),
  "vehicle_info" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "user_profile_idx" ON "t3test_tenant_profile"("user_id");

-- Table: employment_info
-- Stores tenant employment and income information
CREATE TABLE IF NOT EXISTS "t3test_employment_info" (
  "id" SERIAL PRIMARY KEY,
  "tenant_profile_id" INTEGER NOT NULL REFERENCES "t3test_tenant_profile"("id"),
  "employer_name" VARCHAR(256) NOT NULL,
  "employer_address" TEXT,
  "employer_phone" VARCHAR(20),
  "position" VARCHAR(256) NOT NULL,
  "employment_type" VARCHAR(50) NOT NULL,
  "start_date" TIMESTAMP WITH TIME ZONE,
  "end_date" TIMESTAMP WITH TIME ZONE,
  "annual_income" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "supervisor_name" VARCHAR(256),
  "supervisor_phone" VARCHAR(20),
  "supervisor_email" VARCHAR(256),
  "is_current" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "tenant_employment_idx" ON "t3test_employment_info"("tenant_profile_id");

-- Table: rental_history
-- Stores tenant's previous rental information
CREATE TABLE IF NOT EXISTS "t3test_rental_history" (
  "id" SERIAL PRIMARY KEY,
  "tenant_profile_id" INTEGER NOT NULL REFERENCES "t3test_tenant_profile"("id"),
  "address" TEXT NOT NULL,
  "landlord_name" VARCHAR(256) NOT NULL,
  "landlord_phone" VARCHAR(20),
  "landlord_email" VARCHAR(256),
  "move_in_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "move_out_date" TIMESTAMP WITH TIME ZONE,
  "monthly_rent" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "reason_for_leaving" TEXT,
  "is_current" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "tenant_rental_history_idx" ON "t3test_rental_history"("tenant_profile_id");

-- Table: references
-- Stores tenant references (personal and professional)
CREATE TABLE IF NOT EXISTS "t3test_reference" (
  "id" SERIAL PRIMARY KEY,
  "tenant_profile_id" INTEGER NOT NULL REFERENCES "t3test_tenant_profile"("id"),
  "reference_type" VARCHAR(50) NOT NULL,
  "full_name" VARCHAR(256) NOT NULL,
  "relationship" VARCHAR(100),
  "phone" VARCHAR(20) NOT NULL,
  "email" VARCHAR(256),
  "years_known" INTEGER,
  "can_contact" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "tenant_reference_idx" ON "t3test_reference"("tenant_profile_id");

-- Table: emergency_contacts
-- Stores emergency contact information
CREATE TABLE IF NOT EXISTS "t3test_emergency_contact" (
  "id" SERIAL PRIMARY KEY,
  "tenant_profile_id" INTEGER NOT NULL REFERENCES "t3test_tenant_profile"("id"),
  "full_name" VARCHAR(256) NOT NULL,
  "relationship" VARCHAR(100) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "alternate_phone" VARCHAR(20),
  "email" VARCHAR(256),
  "address" TEXT,
  "is_primary" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "tenant_emergency_contact_idx" ON "t3test_emergency_contact"("tenant_profile_id");

-- Table: tenant_documents
-- Stores uploaded document information
CREATE TABLE IF NOT EXISTS "t3test_tenant_document" (
  "id" SERIAL PRIMARY KEY,
  "tenant_profile_id" INTEGER NOT NULL REFERENCES "t3test_tenant_profile"("id"),
  "document_type" VARCHAR(50) NOT NULL,
  "file_name" VARCHAR(256) NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_size" INTEGER,
  "mime_type" VARCHAR(100),
  "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "verified_at" TIMESTAMP WITH TIME ZONE,
  "verified_by" INTEGER REFERENCES "t3test_user"("id"),
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending_review',
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "tenant_document_idx" ON "t3test_tenant_document"("tenant_profile_id", "document_type");
CREATE INDEX IF NOT EXISTS "document_status_idx" ON "t3test_tenant_document"("status");

-- Add comments for documentation
COMMENT ON TABLE "t3test_tenant_invitation" IS 'Stores invitation records sent by landlords to tenants for onboarding';
COMMENT ON TABLE "t3test_tenant_onboarding_progress" IS 'Tracks tenant progress through the onboarding steps';
COMMENT ON TABLE "t3test_tenant_profile" IS 'Stores tenant personal information and preferences';
COMMENT ON TABLE "t3test_employment_info" IS 'Stores tenant employment and income information';
COMMENT ON TABLE "t3test_rental_history" IS 'Stores tenant previous rental history';
COMMENT ON TABLE "t3test_reference" IS 'Stores tenant references (personal and professional)';
COMMENT ON TABLE "t3test_emergency_contact" IS 'Stores emergency contact information for tenants';
COMMENT ON TABLE "t3test_tenant_document" IS 'Stores uploaded document information and verification status';
