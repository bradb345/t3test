CREATE TABLE "t3test_emergency_contact" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_profile_id" integer NOT NULL,
	"full_name" varchar(256) NOT NULL,
	"relationship" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"alternate_phone" varchar(20),
	"email" varchar(256),
	"address" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "t3test_employment_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_profile_id" integer NOT NULL,
	"employer_name" varchar(256) NOT NULL,
	"employer_address" text,
	"employer_phone" varchar(20),
	"position" varchar(256) NOT NULL,
	"employment_type" varchar(50) NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"annual_income" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"supervisor_name" varchar(256),
	"supervisor_phone" varchar(20),
	"supervisor_email" varchar(256),
	"is_current" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "t3test_notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(256) NOT NULL,
	"message" text NOT NULL,
	"data" text,
	"read" boolean DEFAULT false NOT NULL,
	"action_url" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "t3test_reference" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_profile_id" integer NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"full_name" varchar(256) NOT NULL,
	"relationship" varchar(100),
	"phone" varchar(20) NOT NULL,
	"email" varchar(256),
	"years_known" integer,
	"can_contact" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "t3test_rental_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_profile_id" integer NOT NULL,
	"address" text NOT NULL,
	"landlord_name" varchar(256) NOT NULL,
	"landlord_phone" varchar(20),
	"landlord_email" varchar(256),
	"move_in_date" timestamp with time zone NOT NULL,
	"move_out_date" timestamp with time zone,
	"monthly_rent" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"reason_for_leaving" text,
	"is_current" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "t3test_tenant_document" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_profile_id" integer NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"file_name" varchar(256) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"uploaded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" integer,
	"status" varchar(20) DEFAULT 'pending_review' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "t3test_tenant_invitation" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"landlord_id" integer NOT NULL,
	"tenant_email" varchar(256) NOT NULL,
	"tenant_name" varchar(256) NOT NULL,
	"invitation_token" varchar(256) NOT NULL,
	"is_existing_tenant" boolean DEFAULT false NOT NULL,
	"rent_due_day" integer,
	"lease_documents" text,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"tenant_user_id" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "t3test_tenant_invitation_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "t3test_tenant_offboarding_notice" (
	"id" serial PRIMARY KEY NOT NULL,
	"lease_id" integer NOT NULL,
	"initiated_by" varchar(20) NOT NULL,
	"initiated_by_user_id" integer NOT NULL,
	"notice_date" timestamp with time zone NOT NULL,
	"move_out_date" timestamp with time zone NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_user_id" integer,
	"cancellation_reason" text,
	"inspection_date" timestamp with time zone,
	"inspection_notes" text,
	"inspection_completed" boolean DEFAULT false,
	"deposit_status" varchar(20) DEFAULT 'pending',
	"deposit_notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "t3test_tenant_onboarding_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"invitation_id" integer NOT NULL,
	"tenant_user_id" integer,
	"current_step" integer DEFAULT 1 NOT NULL,
	"completed_steps" text,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"data" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "t3test_tenant_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date_of_birth" timestamp with time zone,
	"ssn_encrypted" text,
	"ssn_last4" varchar(4),
	"drivers_license_number" varchar(50),
	"drivers_license_state" varchar(2),
	"marital_status" varchar(20),
	"number_of_occupants" integer,
	"has_pets" boolean DEFAULT false,
	"pet_details" text,
	"smoking_status" varchar(20),
	"vehicle_info" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "t3test_tenant_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "t3test_viewing_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"phone" varchar(20),
	"preferred_date" timestamp with time zone,
	"preferred_time" varchar(50),
	"message" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"landlord_notes" text,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "t3test_property" ALTER COLUMN "currency" SET DEFAULT 'KYD';--> statement-breakpoint
ALTER TABLE "t3test_lease" ADD COLUMN "rent_due_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "t3test_payment" ADD COLUMN "lease_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "t3test_emergency_contact" ADD CONSTRAINT "t3test_emergency_contact_tenant_profile_id_t3test_tenant_profile_id_fk" FOREIGN KEY ("tenant_profile_id") REFERENCES "public"."t3test_tenant_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_employment_info" ADD CONSTRAINT "t3test_employment_info_tenant_profile_id_t3test_tenant_profile_id_fk" FOREIGN KEY ("tenant_profile_id") REFERENCES "public"."t3test_tenant_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_notification" ADD CONSTRAINT "t3test_notification_user_id_t3test_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_reference" ADD CONSTRAINT "t3test_reference_tenant_profile_id_t3test_tenant_profile_id_fk" FOREIGN KEY ("tenant_profile_id") REFERENCES "public"."t3test_tenant_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_rental_history" ADD CONSTRAINT "t3test_rental_history_tenant_profile_id_t3test_tenant_profile_id_fk" FOREIGN KEY ("tenant_profile_id") REFERENCES "public"."t3test_tenant_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_document" ADD CONSTRAINT "t3test_tenant_document_tenant_profile_id_t3test_tenant_profile_id_fk" FOREIGN KEY ("tenant_profile_id") REFERENCES "public"."t3test_tenant_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_document" ADD CONSTRAINT "t3test_tenant_document_verified_by_t3test_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_invitation" ADD CONSTRAINT "t3test_tenant_invitation_unit_id_t3test_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."t3test_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_invitation" ADD CONSTRAINT "t3test_tenant_invitation_landlord_id_t3test_user_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_invitation" ADD CONSTRAINT "t3test_tenant_invitation_tenant_user_id_t3test_user_id_fk" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_offboarding_notice" ADD CONSTRAINT "t3test_tenant_offboarding_notice_lease_id_t3test_lease_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."t3test_lease"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_offboarding_notice" ADD CONSTRAINT "t3test_tenant_offboarding_notice_initiated_by_user_id_t3test_user_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_offboarding_notice" ADD CONSTRAINT "t3test_tenant_offboarding_notice_cancelled_by_user_id_t3test_user_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_onboarding_progress" ADD CONSTRAINT "t3test_tenant_onboarding_progress_invitation_id_t3test_tenant_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."t3test_tenant_invitation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_onboarding_progress" ADD CONSTRAINT "t3test_tenant_onboarding_progress_tenant_user_id_t3test_user_id_fk" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_tenant_profile" ADD CONSTRAINT "t3test_tenant_profile_user_id_t3test_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "t3test_viewing_request" ADD CONSTRAINT "t3test_viewing_request_unit_id_t3test_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."t3test_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_emergency_contact_idx" ON "t3test_emergency_contact" USING btree ("tenant_profile_id");--> statement-breakpoint
CREATE INDEX "tenant_employment_idx" ON "t3test_employment_info" USING btree ("tenant_profile_id");--> statement-breakpoint
CREATE INDEX "user_notification_idx" ON "t3test_notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_read_idx" ON "t3test_notification" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "tenant_reference_idx" ON "t3test_reference" USING btree ("tenant_profile_id");--> statement-breakpoint
CREATE INDEX "tenant_rental_history_idx" ON "t3test_rental_history" USING btree ("tenant_profile_id");--> statement-breakpoint
CREATE INDEX "tenant_document_idx" ON "t3test_tenant_document" USING btree ("tenant_profile_id","document_type");--> statement-breakpoint
CREATE INDEX "document_status_idx" ON "t3test_tenant_document" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invitation_token_idx" ON "t3test_tenant_invitation" USING btree ("invitation_token");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "t3test_tenant_invitation" USING btree ("tenant_email");--> statement-breakpoint
CREATE INDEX "invitation_status_idx" ON "t3test_tenant_invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offboarding_lease_idx" ON "t3test_tenant_offboarding_notice" USING btree ("lease_id");--> statement-breakpoint
CREATE INDEX "offboarding_notice_status_idx" ON "t3test_tenant_offboarding_notice" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invitation_progress_idx" ON "t3test_tenant_onboarding_progress" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "tenant_progress_idx" ON "t3test_tenant_onboarding_progress" USING btree ("tenant_user_id");--> statement-breakpoint
CREATE INDEX "onboarding_status_idx" ON "t3test_tenant_onboarding_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_profile_idx" ON "t3test_tenant_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "viewing_unit_idx" ON "t3test_viewing_request" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "viewing_status_idx" ON "t3test_viewing_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "viewing_email_idx" ON "t3test_viewing_request" USING btree ("email");--> statement-breakpoint
ALTER TABLE "t3test_payment" ADD CONSTRAINT "t3test_payment_lease_id_t3test_lease_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."t3test_lease"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_lease_idx" ON "t3test_payment" USING btree ("lease_id");