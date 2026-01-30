import { defineConfig } from "cypress";
import { config } from "dotenv";
import pg from "postgres";

// Load env vars for DB access in Cypress tasks
config();

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on) {
      on("task", {
        /**
         * Query the DB for the latest invitation token for a given tenant email.
         * Returns the token string or null if not found.
         */
        async getInvitationToken(email: string) {
          const connectionString = process.env.POSTGRES_URL;
          if (!connectionString) {
            throw new Error("Missing POSTGRES_URL environment variable");
          }

          const sql = pg(connectionString);
          try {
            const rows = await sql`
              SELECT invitation_token
              FROM t3test_tenant_invitation
              WHERE tenant_email = ${email}
              ORDER BY created_at DESC
              LIMIT 1
            `;
            return rows[0]?.invitation_token ?? null;
          } finally {
            await sql.end();
          }
        },

        /**
         * Reset the test tenant's unit so offboarding tests can run from a clean state.
         * Deletes offboarding notices, leases, and invitations for the test tenant,
         * and marks the unit as available and visible.
         */
        async resetTestTenantUnit(email: string) {
          const connectionString = process.env.POSTGRES_URL;
          if (!connectionString) {
            throw new Error("Missing POSTGRES_URL environment variable");
          }

          const sql = pg(connectionString);
          try {
            // Find the test tenant user
            const users = await sql`
              SELECT id FROM t3test_user WHERE email = ${email} LIMIT 1
            `;
            const tenantId = users[0]?.id;

            if (tenantId) {
              // Update the user's name to match what the test expects
              await sql`
                UPDATE t3test_user
                SET first_name = 'Test', last_name = 'Tenant'
                WHERE id = ${tenantId}
              `;

              // Delete offboarding notices for the tenant's leases
              await sql`
                DELETE FROM t3test_tenant_offboarding_notice
                WHERE lease_id IN (
                  SELECT id FROM t3test_lease WHERE tenant_id = ${tenantId}
                )
              `;

              // Get unit IDs from the tenant's leases before deleting them
              const leaseUnits = await sql`
                SELECT unit_id FROM t3test_lease WHERE tenant_id = ${tenantId}
              `;

              // Delete the tenant's leases
              await sql`
                DELETE FROM t3test_lease WHERE tenant_id = ${tenantId}
              `;

              // Mark those units as available
              for (const row of leaseUnits) {
                await sql`
                  UPDATE t3test_unit
                  SET is_available = true, is_visible = false, updated_at = NOW()
                  WHERE id = ${row.unit_id}
                `;
              }
            }

            // Delete invitations for this email
            // First delete onboarding progress records
            await sql`
              DELETE FROM t3test_tenant_onboarding_progress
              WHERE invitation_id IN (
                SELECT id FROM t3test_tenant_invitation WHERE tenant_email = ${email}
              )
            `;
            await sql`
              DELETE FROM t3test_tenant_invitation WHERE tenant_email = ${email}
            `;

            return { success: true };
          } finally {
            await sql.end();
          }
        },
      });
    },
    // Increase default timeout for slower authentication flows
    defaultCommandTimeout: 10000,
    // Video recording settings
    video: false,
    // Screenshot settings
    screenshotOnRunFailure: true,
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    // Retry settings for better stability in headless mode
    retries: {
      runMode: 2, // Retry failed tests up to 2 times in headless mode
      openMode: 0, // No retries in interactive mode
    },
    // Increase page load timeout for slower CI environments
    pageLoadTimeout: 60000,
    // Disable test isolation to preserve state between tests in the same spec
    testIsolation: false,
  },
});
