ALTER TABLE "t3test_lease" ADD COLUMN "previous_lease_id" integer;--> statement-breakpoint
CREATE INDEX "previous_lease_idx" ON "t3test_lease" USING btree ("previous_lease_id");