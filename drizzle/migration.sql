ALTER TABLE "t3test_user" 
  ADD COLUMN "first_name" varchar(256) NOT NULL,
  ADD COLUMN "last_name" varchar(256) NOT NULL;

-- Copy existing name data to first_name (optional, if you want to preserve existing data)
UPDATE "t3test_user" 
SET "first_name" = split_part("name", ' ', 1),
    "last_name" = CASE 
      WHEN position(' ' in "name") > 0 
      THEN substring("name" from position(' ' in "name") + 1)
      ELSE ''
    END;

ALTER TABLE "t3test_user" DROP COLUMN "name";
DROP INDEX IF EXISTS "name_idx";
CREATE INDEX IF NOT EXISTS "name_idx" ON "t3test_user" ("first_name", "last_name"); 