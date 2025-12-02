-- Add is_existing_tenant column to tenant_invitation table
ALTER TABLE "t3test_tenant_invitation" ADD COLUMN "is_existing_tenant" boolean DEFAULT false NOT NULL;
