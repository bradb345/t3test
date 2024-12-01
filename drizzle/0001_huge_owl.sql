ALTER TABLE "t3test_user" RENAME COLUMN "name" TO "first_name";--> statement-breakpoint
DROP INDEX IF EXISTS "name_idx";--> statement-breakpoint
ALTER TABLE "t3test_user" ADD COLUMN "last_name" varchar(256) NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "name_idx" ON "t3test_user" USING btree ("first_name","last_name");