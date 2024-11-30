CREATE TABLE IF NOT EXISTS "t3test_user" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_id" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL,
	"image_url" varchar(256),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "t3test_user_auth_id_unique" UNIQUE("auth_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "name_idx" ON "t3test_user" USING btree ("name");