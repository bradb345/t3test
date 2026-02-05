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
         * Create a test property and unit in the DB for tenant journey tests.
         * Returns { propertyId, unitId } for use in tests.
         */
        async setupTenantJourneyTest() {
          const connectionString = process.env.POSTGRES_URL;
          if (!connectionString) {
            throw new Error("Missing POSTGRES_URL environment variable");
          }

          const sql = pg(connectionString);
          try {
            // Find the landlord user's Clerk auth_id (properties.user_id stores auth_id, not DB id)
            const users = await sql`
              SELECT auth_id FROM t3test_user
              WHERE email = 'doe+clerk_test@example.com'
              LIMIT 1
            `;
            const landlordAuthId = (users[0] as { auth_id: string } | undefined)?.auth_id;
            if (!landlordAuthId) {
              throw new Error("Landlord test user not found");
            }

            // Insert test property
            const propertyRows = await sql`
              INSERT INTO t3test_property (
                user_id, name, address, country, latitude, longitude,
                currency, property_type, description
              ) VALUES (
                ${landlordAuthId},
                'Cypress Test Property Journey',
                '123 Test Street, George Town, Grand Cayman',
                'KY',
                19.2869,
                -81.3674,
                'KYD',
                'apartment',
                'Test property for Cypress tenant journey tests'
              )
              RETURNING id
            `;
            const propertyId = (propertyRows[0] as { id: number } | undefined)?.id;

            // Insert test unit
            const unitRows = await sql`
              INSERT INTO t3test_unit (
                property_id, unit_number, num_bedrooms, num_bathrooms,
                monthly_rent, currency, is_available, is_visible,
                description
              ) VALUES (
                ${propertyId!},
                '101',
                2,
                1.5,
                2500.00,
                'KYD',
                true,
                true,
                'Test unit for Cypress tenant journey tests'
              )
              RETURNING id
            `;
            const unitId = (unitRows[0] as { id: number } | undefined)?.id;

            return { propertyId, unitId } as { propertyId: number; unitId: number };
          } finally {
            await sql.end();
          }
        },

        /**
         * Clean up all tenant journey test data (viewing requests, applications,
         * messages, units, and properties).
         */
        async cleanupTenantJourneyData() {
          const connectionString = process.env.POSTGRES_URL;
          if (!connectionString) {
            throw new Error("Missing POSTGRES_URL environment variable");
          }

          const sql = pg(connectionString);
          try {
            // Find journey test properties
            const properties = await sql`
              SELECT id FROM t3test_property
              WHERE name = 'Cypress Test Property Journey'
            `;
            const propertyIds = (properties as { id: number }[]).map(
              (p) => p.id
            );

            if (propertyIds.length > 0) {
              // Find units for these properties
              const units = await sql`
                SELECT id FROM t3test_unit
                WHERE property_id IN ${sql(propertyIds)}
              `;
              const unitIds = (units as { id: number }[]).map((u) => u.id);

              if (unitIds.length > 0) {
                // Delete viewing requests for these units
                await sql`
                  DELETE FROM t3test_viewing_request
                  WHERE unit_id IN ${sql(unitIds)}
                `;

                // Delete tenancy applications for these units
                await sql`
                  DELETE FROM t3test_tenancy_application
                  WHERE unit_id IN ${sql(unitIds)}
                `;

                // Delete tenant invitations for these units
                // (created when landlord approves an application)
                await sql`
                  DELETE FROM t3test_tenant_onboarding_progress
                  WHERE invitation_id IN (
                    SELECT id FROM t3test_tenant_invitation
                    WHERE unit_id IN ${sql(unitIds)}
                  )
                `;
                await sql`
                  DELETE FROM t3test_tenant_invitation
                  WHERE unit_id IN ${sql(unitIds)}
                `;

                // Delete units
                await sql`
                  DELETE FROM t3test_unit
                  WHERE id IN ${sql(unitIds)}
                `;
              }

              // Delete properties
              await sql`
                DELETE FROM t3test_property
                WHERE id IN ${sql(propertyIds)}
              `;
            }

            // Delete messages between the landlord and journey tenant
            const testUsers = await sql`
              SELECT id FROM t3test_user
              WHERE email IN ('doe+clerk_test@example.com', 'jones+clerk_test@example.com')
            `;
            const testUserIds = (testUsers as { id: number }[]).map(
              (u) => u.id
            );

            if (testUserIds.length === 2) {
              await sql`
                DELETE FROM t3test_message
                WHERE from_user_id IN ${sql(testUserIds)}
                  AND to_user_id IN ${sql(testUserIds)}
              `;
            }

            return { success: true };
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
