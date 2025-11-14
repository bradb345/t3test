ALTER TABLE "t3test_property" ALTER COLUMN "total_units" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "t3test_unit" ADD COLUMN "description" text;