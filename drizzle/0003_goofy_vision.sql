CREATE TABLE IF NOT EXISTS "t3test_lease" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"landlord_id" integer NOT NULL,
	"lease_start" timestamp with time zone NOT NULL,
	"lease_end" timestamp with time zone NOT NULL,
	"monthly_rent" numeric(10, 2) NOT NULL,
	"security_deposit" numeric(10, 2),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"documents" text,
	"terms" text,
	"renewal_option" boolean DEFAULT false,
	"auto_renewal" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "t3test_maintenance_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"assigned_to" integer,
	"category" varchar(50) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"image_urls" text,
	"scheduled_for" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "t3test_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"property_id" integer,
	"subject" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'unread' NOT NULL,
	"attachments" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "t3test_payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" varchar(50),
	"transaction_id" varchar(256),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "t3test_property" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"address" text NOT NULL,
	"country" varchar(2) NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"description" text,
	"year_built" integer,
	"total_units" integer NOT NULL,
	"property_type" varchar(50) NOT NULL,
	"amenities" text,
	"parking_available" boolean DEFAULT false,
	"image_urls" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "t3test_unit" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"unit_number" varchar(50) NOT NULL,
	"floor_plan" varchar(50),
	"square_feet" integer,
	"num_bedrooms" integer NOT NULL,
	"num_bathrooms" numeric NOT NULL,
	"monthly_rent" numeric(10, 2) NOT NULL,
	"deposit" numeric(10, 2),
	"is_available" boolean DEFAULT true,
	"available_from" timestamp with time zone,
	"features" text,
	"image_urls" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "t3test_user" ADD COLUMN "roles" text;--> statement-breakpoint
ALTER TABLE "t3test_user" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "t3test_user" ADD COLUMN "preferred_contact_method" varchar(20);--> statement-breakpoint
ALTER TABLE "t3test_user" ADD COLUMN "notifications" text;--> statement-breakpoint
ALTER TABLE "t3test_user" ADD COLUMN "stripe_customer_id" varchar(256);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_lease" ADD CONSTRAINT "t3test_lease_unit_id_t3test_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."t3test_unit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_lease" ADD CONSTRAINT "t3test_lease_tenant_id_t3test_user_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_lease" ADD CONSTRAINT "t3test_lease_landlord_id_t3test_user_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_maintenance_request" ADD CONSTRAINT "t3test_maintenance_request_unit_id_t3test_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."t3test_unit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_maintenance_request" ADD CONSTRAINT "t3test_maintenance_request_requested_by_t3test_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_maintenance_request" ADD CONSTRAINT "t3test_maintenance_request_assigned_to_t3test_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_message" ADD CONSTRAINT "t3test_message_from_user_id_t3test_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_message" ADD CONSTRAINT "t3test_message_to_user_id_t3test_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_message" ADD CONSTRAINT "t3test_message_property_id_t3test_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."t3test_property"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_payment" ADD CONSTRAINT "t3test_payment_tenant_id_t3test_user_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_property" ADD CONSTRAINT "t3test_property_user_id_t3test_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "t3test_unit" ADD CONSTRAINT "t3test_unit_property_id_t3test_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."t3test_property"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unit_lease_idx" ON "t3test_lease" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_lease_idx" ON "t3test_lease" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "landlord_lease_idx" ON "t3test_lease" USING btree ("landlord_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lease_status_idx" ON "t3test_lease" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "status_idx" ON "t3test_maintenance_request" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unit_request_idx" ON "t3test_maintenance_request" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_message_idx" ON "t3test_message" USING btree ("to_user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_message_idx" ON "t3test_message" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_payment_idx" ON "t3test_payment" USING btree ("tenant_id","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_status_idx" ON "t3test_payment" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_idx" ON "t3test_property" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "country_idx" ON "t3test_property" USING btree ("country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_idx" ON "t3test_property" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_unit_idx" ON "t3test_unit" USING btree ("property_id","unit_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "availability_idx" ON "t3test_unit" USING btree ("is_available","available_from");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_idx" ON "t3test_user" USING btree ("email");