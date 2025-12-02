-- Migration to encrypt SSN field in tenant_profile table
-- This migration adds encrypted SSN storage and removes plaintext SSN

-- Add new encrypted SSN columns
ALTER TABLE "t3test_tenant_profile" 
  ADD COLUMN IF NOT EXISTS "ssn_encrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "ssn_last4" VARCHAR(4);

-- Note: Any existing plaintext SSN data should be migrated manually by:
-- 1. Reading existing ssn values
-- 2. Encrypting them using the encryption utility
-- 3. Storing encrypted value in ssn_encrypted and last 4 digits in ssn_last4
-- 4. Then dropping the old ssn column

-- Drop the old plaintext SSN column after data migration
-- IMPORTANT: Only run this after migrating existing data
ALTER TABLE "t3test_tenant_profile" 
  DROP COLUMN IF EXISTS "ssn";

-- Add comments for documentation
COMMENT ON COLUMN "t3test_tenant_profile"."ssn_encrypted" IS 'Encrypted SSN using AES-256-GCM, format: iv:authTag:ciphertext (base64-encoded)';
COMMENT ON COLUMN "t3test_tenant_profile"."ssn_last4" IS 'Last 4 digits of SSN for display purposes only (not sensitive)';
