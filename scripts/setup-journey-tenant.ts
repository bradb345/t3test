/**
 * One-time Setup: Create a dedicated Clerk test user for tenant journey E2E tests.
 *
 * This keeps the journey tests isolated from the offboarding tests, which use
 * smith+clerk_test@example.com. Run once before first test execution:
 *
 *   npx tsx scripts/setup-journey-tenant.ts
 *
 * The Clerk webhook will create the DB record on first sign-in.
 * If the user already exists in Clerk, this script is a no-op.
 */

import { config } from "dotenv";
config();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error("❌ Missing CLERK_SECRET_KEY in environment");
  process.exit(1);
}

const EMAIL = "jones+clerk_test@example.com";
const PASSWORD = "Kx9$mPvR2wL!nQ7j";
const FIRST_NAME = "Test";
const LAST_NAME = "Journey";

async function main() {
  console.log("\n🔧 Setting up journey tenant test user\n");

  // Check if user already exists
  const searchRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(EMAIL)}`,
    {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    }
  );

  if (!searchRes.ok) {
    console.error("❌ Failed to search Clerk users:", await searchRes.text());
    process.exit(1);
  }

  const existing = (await searchRes.json()) as { id: string }[];
  if (existing.length > 0) {
    console.log(`✅ User ${EMAIL} already exists in Clerk (ID: ${existing[0]!.id})`);
    console.log("   No action needed.\n");
    return;
  }

  // Create the user
  console.log(`Creating Clerk user: ${EMAIL}`);
  const createRes = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [EMAIL],
      password: PASSWORD,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      skip_password_checks: true,
    }),
  });

  if (!createRes.ok) {
    console.error("❌ Failed to create Clerk user:", await createRes.text());
    process.exit(1);
  }

  const created = (await createRes.json()) as { id: string };
  console.log(`✅ Created user ${EMAIL} (Clerk ID: ${created.id})`);
  console.log(
    "   The DB record will be created automatically on first sign-in via the Clerk webhook.\n"
  );
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
