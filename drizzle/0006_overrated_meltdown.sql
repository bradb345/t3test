ALTER TABLE "t3test_unit" ALTER COLUMN "floor_plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "t3test_unit" ADD COLUMN "is_visible" boolean DEFAULT false;