/// <reference types="cypress" />

/**
 * Refunds & Security Deposit Returns E2E Tests
 *
 * Prerequisites: A property with a vacant unit must already exist for the
 * landlord test account. The test will use the first available property/unit.
 *
 * Flow:
 * 1. Landlord invites tenant with lease document
 * 2. Tenant completes 6-step onboarding (lease becomes active)
 * 3. Landlord issues a regular refund
 * 4. Tenant confirms the refund
 * 5. Landlord sees completed refund
 * 6. Landlord issues security deposit return with deductions
 * 7. Tenant confirms deposit return with deductions
 * 8. Landlord cancels a pending refund
 */

describe("Refunds & Security Deposit Returns", () => {
  // Ignore React hydration errors and benign browser errors
  Cypress.on("uncaught:exception", (err) => {
    if (
      err.message.includes("Hydration failed") ||
      err.message.includes("hydrating") ||
      err.message.includes("Minified React error") ||
      err.message.includes("ResizeObserver loop")
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

  // Helper to navigate to the financials tab
  const navigateToFinancials = () => {
    cy.visit("/my-properties?tab=financials");
    cy.contains("h2", "Financials", { timeout: 10000 }).should("be.visible");
  };

  // Helper to open IssueRefundModal from the RefundsSection
  const openIssueRefundModal = () => {
    cy.contains("Refunds & Deposit Returns").scrollIntoView();
    cy.contains("button", "Issue Refund").click();
    cy.contains("Create a refund or return a security deposit", {
      timeout: 5000,
    }).should("be.visible");
  };

  // Helper to select the test tenant in the IssueRefundModal
  const selectTenant = () => {
    // Click the Tenant select trigger
    cy.get('[role="dialog"]').within(() => {
      cy.contains("label", "Tenant")
        .parent()
        .find("button[role='combobox']")
        .click();
    });
    // Select tenant from dropdown
    cy.contains('[role="option"]', testTenant.name).click();
  };

  // Helper to select refund type
  const selectType = (type: "Refund" | "Security Deposit Return") => {
    cy.get('[role="dialog"]').within(() => {
      cy.contains("label", "Type")
        .parent()
        .find("button[role='combobox']")
        .click();
    });
    cy.contains('[role="option"]', type).click();
  };

  before(() => {
    // Reset the test tenant's unit to a clean state (removes refunds, leases, notices, invitations)
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
  });

  describe("Refund Flows", () => {
    it("3. should issue a regular refund as landlord", () => {
      loginAsLandlord();
      navigateToFinancials();

      // Open the Issue Refund modal
      openIssueRefundModal();

      // Select the test tenant
      selectTenant();

      // Type defaults to "Refund", verify it
      cy.get('[role="dialog"]').within(() => {
        // Enter amount
        cy.get('input[inputmode="decimal"]').clear().type("100");

        // Enter reason
        cy.get("textarea").type("Overpayment adjustment");

        // Submit
        cy.contains("button", "Issue Refund").click();
      });

      // Verify success alert
      cy.contains("Refund Created", { timeout: 10000 }).should("be.visible");
      cy.contains("OK").click();

      // Verify refund appears in the table with "Awaiting Tenant" badge
      cy.contains("Refunds & Deposit Returns").scrollIntoView();
      cy.contains("Awaiting Tenant", { timeout: 10000 }).should("be.visible");
    });

    it("4. should confirm the refund as tenant", () => {
      loginAsTenant();

      // Navigate to tenant dashboard → Payments tab
      cy.visit("/dashboard");
      cy.contains("Welcome back", { timeout: 15000 }).should("be.visible");
      cy.contains('[role="tab"]', "Payments").click();

      // Verify "Pending Refunds" section is visible
      cy.contains("Pending Refunds", { timeout: 10000 }).should("be.visible");
      cy.contains("Overpayment adjustment").should("be.visible");

      // Click "Confirm" on the pending refund
      cy.contains("Pending Refunds")
        .closest("[class*='card']")
        .contains("button", "Confirm")
        .click();

      // Verify the ConfirmRefundModal shows
      cy.contains("Confirm Refund", { timeout: 5000 }).should("be.visible");
      cy.contains("Overpayment adjustment").should("be.visible");

      // Click "Confirm & Receive Funds"
      cy.contains("button", "Confirm & Receive Funds").click();

      // Verify success alert
      cy.contains("Refund Confirmed", { timeout: 10000 }).should("be.visible");
      cy.contains("OK").click();
    });

    it("5. should show completed refund on landlord financials", () => {
      loginAsLandlord();
      navigateToFinancials();

      // Scroll to refunds section and verify the refund shows "Completed"
      cy.contains("Refunds & Deposit Returns").scrollIntoView();
      cy.contains("Completed", { timeout: 10000 }).should("be.visible");
    });

    it("6. should issue a security deposit return with deductions", () => {
      loginAsLandlord();
      navigateToFinancials();

      // Open the Issue Refund modal
      openIssueRefundModal();

      // Select the test tenant
      selectTenant();

      // Change type to Security Deposit Return
      selectType("Security Deposit Return");

      // Wait for deposit return details to appear
      cy.contains("Security Deposit", { timeout: 5000 }).should("be.visible");

      cy.get('[role="dialog"]').within(() => {
        // Add first deduction: Carpet cleaning - $200
        cy.contains("button", "Add Deduction").click();
        cy.get('input[placeholder="Description"]').first().type("Carpet cleaning");
        cy.get('input[placeholder="Amount"]').first().type("200");

        // Add second deduction: Wall repair - $150
        cy.contains("button", "Add Deduction").click();
        cy.get('input[placeholder="Description"]').last().type("Wall repair");
        cy.get('input[placeholder="Amount"]').last().type("150");

        // Verify deduction totals are shown
        cy.contains("Total Deductions").should("be.visible");
        cy.contains("Return Amount").should("be.visible");

        // Enter reason
        cy.get("textarea").type("End of lease deposit return");

        // Submit
        cy.contains("button", "Return Deposit").click();
      });

      // Verify success alert
      cy.contains("Refund Created", { timeout: 10000 }).should("be.visible");
      cy.contains("OK").click();

      // Verify the deposit return appears in table with "Awaiting Tenant"
      cy.contains("Refunds & Deposit Returns").scrollIntoView();
      cy.contains("Deposit Return", { timeout: 10000 }).should("be.visible");
      cy.contains("Awaiting Tenant").should("be.visible");
    });

    it("7. should confirm deposit return with deductions as tenant", () => {
      loginAsTenant();

      // Navigate to tenant dashboard → Payments tab
      cy.visit("/dashboard");
      cy.contains("Welcome back", { timeout: 15000 }).should("be.visible");
      cy.contains('[role="tab"]', "Payments").click();

      // Verify "Pending Refunds" section shows the deposit return
      cy.contains("Pending Refunds", { timeout: 10000 }).should("be.visible");
      cy.contains("Security Deposit Return").should("be.visible");

      // Click "Confirm" on the deposit return
      cy.contains("Security Deposit Return")
        .closest("[class*='rounded-lg border']")
        .contains("button", "Confirm")
        .click();

      // Verify the ConfirmRefundModal shows deposit details
      cy.contains("Security Deposit Return", { timeout: 5000 }).should(
        "be.visible"
      );

      // Verify itemized deductions are shown
      cy.contains("Itemized Deductions").should("be.visible");
      cy.contains("Carpet cleaning").should("be.visible");
      cy.contains("Wall repair").should("be.visible");

      // Click "Confirm & Receive Funds"
      cy.contains("button", "Confirm & Receive Funds").click();

      // Verify success alert
      cy.contains("Refund Confirmed", { timeout: 10000 }).should("be.visible");
      cy.contains("OK").click();
    });

    it("8. should cancel a pending refund as landlord", () => {
      loginAsLandlord();
      navigateToFinancials();

      // Open the Issue Refund modal to create a new refund to cancel
      openIssueRefundModal();

      // Select the test tenant
      selectTenant();

      cy.get('[role="dialog"]').within(() => {
        // Enter amount
        cy.get('input[inputmode="decimal"]').clear().type("50");

        // Enter reason
        cy.get("textarea").type("Refund to be cancelled");

        // Submit
        cy.contains("button", "Issue Refund").click();
      });

      // Verify success alert and dismiss
      cy.contains("Refund Created", { timeout: 10000 }).should("be.visible");
      cy.contains("OK").click();

      // Wait for all modals to fully unmount before interacting with the page
      cy.get('[role="dialog"]', { timeout: 10000 }).should("not.exist");

      // Wait for the table to update and find the new pending refund
      cy.contains("Refunds & Deposit Returns").scrollIntoView();
      cy.contains("Awaiting Tenant", { timeout: 10000 }).should("be.visible");

      // Click Cancel on a pending refund row (the one with "Awaiting Tenant")
      cy.contains("tr", "Awaiting Tenant")
        .first()
        .contains("button", "Cancel")
        .click();

      // Confirm cancellation in the alert dialog
      cy.contains("Are you sure you want to cancel this refund", {
        timeout: 5000,
      }).should("be.visible");
      cy.contains("button", "Cancel Refund").click();

      // Verify success alert
      cy.contains("Refund Cancelled", { timeout: 10000 }).should("be.visible");
      cy.contains("OK").click();

      // Verify the refund now shows "Cancelled" badge
      cy.contains("Cancelled", { timeout: 10000 }).should("be.visible");
    });
  });
});
