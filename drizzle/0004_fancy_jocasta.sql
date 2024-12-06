ALTER TABLE "t3test_property" DROP CONSTRAINT "t3test_property_user_id_t3test_user_id_fk";
--> statement-breakpoint
ALTER TABLE "t3test_property" ALTER COLUMN "user_id" SET DATA TYPE text;