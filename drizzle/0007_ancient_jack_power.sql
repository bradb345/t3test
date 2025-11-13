ALTER TABLE "t3test_lease" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "t3test_payment" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "t3test_property" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "t3test_unit" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;