ALTER TABLE "t3test_viewing_request" ADD COLUMN "requester_user_id" integer;
DO $$ BEGIN
 ALTER TABLE "t3test_viewing_request" ADD CONSTRAINT "t3test_viewing_request_requester_user_id_t3test_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."t3test_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "viewing_requester_idx" ON "t3test_viewing_request" USING btree ("requester_user_id");
