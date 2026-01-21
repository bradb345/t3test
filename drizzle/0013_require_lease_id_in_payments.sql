-- Migration: Make lease_id NOT NULL in payments table
-- This ensures all payments are properly linked to a lease for financial tracking

-- First, handle any existing NULL lease_id values
-- Option 1: Delete orphaned payments (uncomment if appropriate for your data)
-- DELETE FROM "t3test_payment" WHERE "lease_id" IS NULL;

-- Option 2: For existing NULL values, you may need to manually associate them with leases
-- before running this migration. Query to find orphaned payments:
-- SELECT * FROM "t3test_payment" WHERE "lease_id" IS NULL;

-- Add NOT NULL constraint (only run after ensuring no NULL values exist)
ALTER TABLE "t3test_payment" ALTER COLUMN "lease_id" SET NOT NULL;
