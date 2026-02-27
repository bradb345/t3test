CREATE TABLE "t3test_refund" (
	"id" serial PRIMARY KEY NOT NULL,
	"lease_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"landlord_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"reason" text,
	"status" varchar(30) DEFAULT 'pending_tenant_action' NOT NULL,
	"deductions" text,
	"stripe_payment_intent_id" varchar(256),
	"stripe_transfer_id" varchar(256),
	"tenant_action_deadline" timestamp with time zone,
	"tenant_confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "t3test_tenancy_application" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"applicant_user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"application_data" text,
	"payment_setup_complete" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" integer,
	"decision" varchar(20),
	"decision_notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "t3test_lease" ADD COLUMN "delinquent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "t3test_lease" ADD COLUMN "lease_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "t3test_payment" ADD COLUMN "platform_fee" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "t3test_payment" ADD COLUMN "landlord_payout" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "t3test_payment" ADD COLUMN "stripe_payment_intent_id" varchar(256);--> statement-breakpoint
ALTER TABLE "t3test_payment" ADD COLUMN "stripe_checkout_session_id" varchar(256);--> statement-breakpoint
ALTER TABLE "t3test_payment" ADD COLUMN "stripe_transfer_id" varchar(256);--> statement-breakpoint
ALTER TABLE "t3test_user" ADD COLUMN "stripe_connected_account_id" varchar(256);--> statement-breakpoint
ALTER TABLE "t3test_user" ADD COLUMN "stripe_connected_account_status" varchar(50);--> statement-breakpoint
ALTER TABLE "t3test_refund" ADD CONSTRAINT "t3test_refund_lease_id_t3test_lease_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."t3test_lease"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_refund" ADD CONSTRAINT "t3test_refund_tenant_id_t3test_user_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_refund" ADD CONSTRAINT "t3test_refund_landlord_id_t3test_user_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenancy_application" ADD CONSTRAINT "t3test_tenancy_application_unit_id_t3test_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."t3test_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenancy_application" ADD CONSTRAINT "t3test_tenancy_application_applicant_user_id_t3test_user_id_fk" FOREIGN KEY ("applicant_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenancy_application" ADD CONSTRAINT "t3test_tenancy_application_reviewed_by_user_id_t3test_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refund_lease_idx" ON "t3test_refund" USING btree ("lease_id");--> statement-breakpoint
CREATE INDEX "refund_tenant_idx" ON "t3test_refund" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "refund_status_idx" ON "t3test_refund" USING btree ("status");--> statement-breakpoint
CREATE INDEX "application_unit_idx" ON "t3test_tenancy_application" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "application_applicant_idx" ON "t3test_tenancy_application" USING btree ("applicant_user_id");--> statement-breakpoint
CREATE INDEX "application_status_idx" ON "t3test_tenancy_application" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stripe_pi_idx" ON "t3test_payment" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "stripe_cs_idx" ON "t3test_payment" USING btree ("stripe_checkout_session_id");