-- Create notifications table
CREATE TABLE IF NOT EXISTS "t3test_notification" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "t3test_user"("id"),
  "type" varchar(50) NOT NULL,
  "title" varchar(256) NOT NULL,
  "message" text NOT NULL,
  "data" text,
  "read" boolean DEFAULT false NOT NULL,
  "action_url" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS "user_notification_idx" ON "t3test_notification" ("user_id");
CREATE INDEX IF NOT EXISTS "notification_read_idx" ON "t3test_notification" ("user_id", "read");
