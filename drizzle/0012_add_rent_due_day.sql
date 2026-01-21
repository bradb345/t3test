ALTER TABLE "t3test_lease" ADD COLUMN "rent_due_day" integer DEFAULT 1;
ALTER TABLE "t3test_tenant_invitation" ADD COLUMN "rent_due_day" integer;
ALTER TABLE "t3test_tenant_invitation" ADD COLUMN "lease_documents" text;
ALTER TABLE "t3test_payment" ADD COLUMN "lease_id" integer REFERENCES "t3test_lease"("id");
CREATE INDEX "payment_lease_idx" ON "t3test_payment" ("lease_id");
