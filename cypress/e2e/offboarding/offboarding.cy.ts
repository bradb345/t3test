/// <reference types="cypress" />

/**
 * Tenant Offboarding E2E Tests
 *
 * Prerequisites: A property with a vacant unit must already exist for the
 * landlord test account. The test will use the first available property/unit.
 *
 * Flow:
 * 1. Landlord invites tenant with lease document
 * 2. Tenant completes 6-step onboarding
 * 3. Tenant verifies move-in payment on dashboard
 * 4-5. Landlord gives 2-month notice, then cancels it
 * 6-7. Landlord gives notice again, then completes the move-out
 */

describe("Tenant Offboarding", () => {
  // Ignore React hydration errors
  Cypress.on("uncaught:exception", (err) => {
    if (
      err.message.includes("Hydration failed") ||
      err.message.includes("hydrating") ||
      err.message.includes("Minified React error")
    ) {
      return false;
    }
    return true;
  });

  const testTenant = {
    name: "Test Tenant",
    email: "smith+clerk_test@example.com",
  };

  // Shared state across tests
  let invitationToken: string;

  // Helper to login as landlord
  const loginAsLandlord = () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.visit("/");
    cy.contains("button", "Sign In", { timeout: 10000 }).should("be.visible");
    cy.clerkLogin({ userType: "landlord" });
    cy.contains("a", "My Properties", { timeout: 15000 }).should("be.visible");
  };

  // Helper to login as tenant
  const loginAsTenant = () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.visit("/");
    cy.contains("button", "Sign In", { timeout: 10000 }).should("be.visible");
    cy.clerkLogin({ userType: "tenant" });
    cy.get(".cl-userButtonTrigger", { timeout: 15000 }).should("be.visible");
  };

  // Helper to navigate to tenants tab and find the test tenant
  const openTenantDetail = (filter: "active" | "notice_given" | "all") => {
    cy.visit("/my-properties?tab=tenants");
    // Wait for the tenants tab to render
    cy.contains("h2", "Tenants", { timeout: 10000 }).should("be.visible");

    // Change the status filter if needed (default is "active")
    if (filter !== "active") {
      // Click the Select trigger (the button with role="combobox")
      cy.get('[role="combobox"]').click();
      if (filter === "notice_given") {
        cy.contains('[role="option"]', "Notice Given").click();
      } else {
        cy.contains('[role="option"]', "All Status").click();
      }
      // Wait for Select popover to fully close before interacting with cards
      cy.get('[role="listbox"]').should("not.exist");
    }

    // Wait for tenant cards to appear
    cy.get('[data-testid="tenant-card"]', { timeout: 15000 }).should("exist");

    // Click "View Details" on the test tenant's card
    cy.contains(testTenant.name)
      .closest('[data-testid="tenant-card"]')
      .contains("button", "View Details")
      .click();

    // Wait for modal to load with contact info
    cy.contains("Contact Information", { timeout: 10000 }).should("be.visible");
  };

  before(() => {
    // Reset the test tenant's unit to a clean state (remove leases, notices, invitations)
    cy.task("resetTestTenantUnit", testTenant.email);
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
  });

  beforeEach(() => {
    cy.viewport(1440, 900);
  });

  describe("Setup: Invite and Onboard Tenant", () => {
    it("1. should invite tenant with lease document", () => {
      loginAsLandlord();

      // Navigate to properties and open the first property
      cy.visit("/my-properties");
      cy.contains('[role="tab"]', "Properties").click();
      cy.contains("View Details", { timeout: 10000 }).first().click();

      // Find the first unit's dropdown menu and open it
      cy.get(".p-6")
        .find("button")
        .filter(":has(svg)")
        .last()
        .click({ force: true });

      // Click Onboard Tenant
      cy.get('[role="menu"], [role="menuitem"]', { timeout: 5000 }).should(
        "exist"
      );
      cy.contains('[role="menuitem"]', "Onboard Tenant").click();

      // Fill invitation form
      cy.get('input[id="tenantName"]').type(testTenant.name);
      cy.get('input[id="tenantEmail"]').type(testTenant.email);

      // Check "existing tenant" checkbox
      cy.get('input[id="isExistingTenant"]').check();

      // Select rent due day
      cy.get('select[id="rentDueDay"]').select("1");

      // Upload lease document
      cy.get('input[id="leaseDocumentUpload"]').selectFile(
        "cypress/fixtures/documents/sample-lease-agreement.pdf",
        { force: true }
      );

      // Wait for upload to complete
      cy.contains("Document 1", { timeout: 30000 }).should("be.visible");

      // Send invitation
      cy.contains("button", "Send Invitation").click();
      cy.contains("Invitation sent", { timeout: 15000 }).should("be.visible");

      // Get the invitation token from the DB for tenant onboarding
      cy.task("getInvitationToken", testTenant.email).then((token) => {
        expect(token).to.be.a("string");
        invitationToken = token as string;
        cy.log(`Got invitation token`);
      });
    });

    it("2. should complete the 6-step tenant onboarding flow", () => {
      loginAsTenant();

      // Navigate to onboarding with the invitation token
      cy.visit(`/onboarding?token=${invitationToken}`);

      // Wait for onboarding page to load
      cy.contains("Tenant Onboarding", { timeout: 15000 }).should(
        "be.visible"
      );
      cy.contains("Step 1 of 6").should("be.visible");

      // ---- Step 1: Personal Info ----
      cy.get('input[id="firstName"]').clear().type("Test");
      cy.get('input[id="lastName"]').clear().type("Tenant");
      cy.get('input[id="email"]').should("have.value", testTenant.email);
      cy.get('input[id="phone"]').clear().type("(555) 123-4567");
      cy.get('input[id="dateOfBirth"]').clear().type("1990-01-15");
      cy.contains("button", "Continue").click();

      // ---- Step 2: Employment ----
      cy.contains("Step 2 of 6", { timeout: 10000 }).should("be.visible");
      cy.get('input[id="employerName"]').clear().type("Test Company Inc.");
      cy.get('input[id="employerPhone"]').clear().type("(555) 987-6543");
      cy.get('input[id="employerAddress"]')
        .clear()
        .type("100 Business Blvd, Los Angeles, CA 90001");
      cy.get('select[id="employmentType"]').select("full_time");
      cy.get('input[id="salary"]').clear().type("$5,000");
      cy.get('select[id="workPermit"]').select("no");
      cy.contains("button", "Continue").click();

      // ---- Step 3: Proof of Address ----
      cy.contains("Step 3 of 6", { timeout: 10000 }).should("be.visible");
      cy.get('input[id="proofOfAddress"]').selectFile(
        "cypress/fixtures/images/test-utility-bill.png",
        { force: true }
      );
      cy.contains("Uploaded:", { timeout: 30000 }).should("be.visible");
      cy.contains("button", "Continue").click();

      // ---- Step 4: Emergency Contact ----
      cy.contains("Step 4 of 6", { timeout: 10000 }).should("be.visible");
      cy.get('input[id="emergencyContactName"]').clear().type("Jane Doe");
      cy.get('input[id="emergencyContactRelationship"]')
        .clear()
        .type("Spouse");
      cy.get('input[id="emergencyContactPhone"]')
        .clear()
        .type("(555) 111-2222");
      cy.contains("button", "Continue").click();

      // ---- Step 5: Photo ID ----
      cy.contains("Step 5 of 6", { timeout: 10000 }).should("be.visible");
      cy.get('input[id="photoId"]').selectFile(
        "cypress/fixtures/images/test-user-id.png",
        { force: true }
      );
      cy.contains("Uploaded:", { timeout: 30000 }).should("be.visible");
      cy.contains("button", "Continue").click();

      // ---- Step 6: Review & Submit ----
      cy.contains("Step 6 of 6", { timeout: 10000 }).should("be.visible");
      cy.contains("Review Your Information").should("be.visible");
      cy.contains("Test Company Inc.").should("be.visible");
      cy.contains("Jane Doe").should("be.visible");

      // Submit the application
      cy.contains("button", "Submit Application").click();
      cy.contains("Onboarding Complete!", { timeout: 15000 }).should(
        "be.visible"
      );
    });

    it("3. should show move-in payment on tenant dashboard", () => {
      loginAsTenant();

      // Navigate to tenant dashboard
      cy.visit("/dashboard");
      cy.contains("Welcome back", { timeout: 15000 }).should("be.visible");

      // Click the Payments tab
      cy.contains('[role="tab"]', "Payments").click();

      // Verify the Make a Payment card shows the move-in payment
      cy.contains("Move-In payment", { timeout: 10000 }).should("be.visible");
      cy.contains("First Month's Rent").should("be.visible");
      cy.contains("Pay Move-In").should("be.visible");

      // Verify the billing history shows the Move-In type
      cy.contains("Billing History").should("be.visible");
      cy.get("table").within(() => {
        cy.contains("td", "Move-In").should("be.visible");
        cy.contains("Pending").should("be.visible");
      });
    });
  });

  describe("Give Notice and Cancel", () => {
    it("4. should give 2-month notice to tenant", () => {
      loginAsLandlord();
      openTenantDetail("active");

      // Click Give 2-Month Notice button
      cy.contains("button", "Give 2-Month Notice").should("be.visible").click();

      // Notice modal should open
      cy.contains("This action starts a 2-month countdown").should(
        "be.visible"
      );

      // Enter reason
      cy.get("textarea[id='reason']").type("Testing offboarding flow");

      // Confirm giving notice - target the last dialog (sub-modal)
      cy.get('[role="dialog"]')
        .last()
        .contains("button", "Give Notice")
        .click();

      // Notice should now be active
      cy.contains("Move-Out Notice Active", { timeout: 10000 }).should(
        "be.visible"
      );
    });

    it("5. should cancel the notice", () => {
      loginAsLandlord();

      // Tenant now has notice_given status, must use that filter
      openTenantDetail("notice_given");

      // Should see notice is active
      cy.contains("Move-Out Notice Active", { timeout: 5000 }).should(
        "be.visible"
      );

      // Click Cancel Notice inside the dialog
      cy.get('[role="dialog"]')
        .contains("button", "Cancel Notice")
        .click();

      // Cancel modal should open
      cy.contains("Cancel Move-Out Notice").should("be.visible");

      // Enter cancellation reason
      cy.get("textarea[id='cancel-reason']").type("Testing cancel flow");

      // Confirm cancellation - target the last dialog (sub-modal)
      cy.get('[role="dialog"]')
        .last()
        .contains("button", "Cancel Notice")
        .click();

      // Wait for the cancel modal to close (API completed)
      cy.contains("Cancel Move-Out Notice", { timeout: 10000 }).should(
        "not.exist"
      );

      // Verify the tenant is back to active by navigating to active filter
      cy.visit("/my-properties?tab=tenants");
      cy.contains("h2", "Tenants", { timeout: 10000 }).should("be.visible");
      cy.get('[data-testid="tenant-card"]', { timeout: 15000 }).should("exist");
      cy.contains(testTenant.name).should("be.visible");
    });
  });

  describe("Give Notice and Complete Move-Out", () => {
    it("6. should give notice again", () => {
      loginAsLandlord();

      // After cancellation, lease is back to active
      openTenantDetail("active");

      // Give notice
      cy.contains("button", "Give 2-Month Notice").click();
      cy.get("textarea[id='reason']").type(
        "Final notice - will complete move-out"
      );
      cy.get('[role="dialog"]')
        .last()
        .contains("button", "Give Notice")
        .click();

      cy.contains("Move-Out Notice Active", { timeout: 10000 }).should(
        "be.visible"
      );
    });

    it("7. should complete move-out via Complete Move-Out button", () => {
      loginAsLandlord();

      // Tenant now has notice_given status
      openTenantDetail("notice_given");

      // Should see the notice is active
      cy.contains("Move-Out Notice Active", { timeout: 5000 }).should(
        "be.visible"
      );

      // Click Complete Move-Out inside the dialog
      cy.get('[role="dialog"]')
        .contains("button", "Complete Move-Out")
        .click();

      // Complete offboarding modal should open
      cy.contains("Finalize the move-out").should("be.visible");

      // Fill inspection details
      const today = new Date().toISOString().split("T")[0];
      cy.get('input[id="inspection-date"]').type(today!);
      cy.get("textarea[id='inspection-notes']").type(
        "Unit inspected. Good condition."
      );

      // Deposit status defaults to "Full Refund" which is fine

      // Click Complete Move-Out to submit - target the last dialog (sub-modal)
      cy.get('[role="dialog"]')
        .last()
        .contains("button", "Complete Move-Out")
        .click();

      // Wait for completion - modal should close
      cy.contains("Finalize the move-out", { timeout: 10000 }).should(
        "not.exist"
      );

      // Verify tenant shows as terminated when viewing all statuses
      cy.visit("/my-properties?tab=tenants");
      cy.contains("Tenants", { timeout: 10000 }).should("be.visible");

      // Switch to "Completed" filter to find the terminated tenant
      cy.get('[role="combobox"]').click();
      cy.contains('[role="option"]', "Completed").click();

      cy.get('[data-testid="tenant-card"]', { timeout: 10000 }).should(
        "exist"
      );
      cy.contains(testTenant.name).should("be.visible");
    });
  });
});
