/// <reference types="cypress" />

/**
 * Tenant Journeys E2E Tests
 *
 * Tests four tenant journeys end-to-end:
 * 1. Viewing Requests — tenant submits, landlord sees and approves it
 * 2. Contact & Messaging — tenant contacts landlord, both exchange messages
 * 3. Tenancy Applications — tenant submits full application, landlord reviews and approves it (creates lease + payment)
 * 4. Move-In Payment — tenant signs in and pays move-in via Stripe (lease created on approval)
 *
 * Uses DB tasks to create a test property + unit (avoids flaky Google Places UI).
 */

describe("Tenant Journeys", () => {
  // Suppress React hydration errors
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

  // Shared state across tests
  let unitId: number;

  // Test data constants (DRY)
  const testTenant = {
    name: "Test Tenant",
    email: "jones+clerk_test@example.com",
    phone: "(555) 999-8888",
  };

  const loginAsLandlord = () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.visit("/");
    cy.contains("button", "Sign In", { timeout: 10000 }).should("be.visible");
    cy.clerkLogin({ userType: "landlord" });
    cy.contains("a", "My Properties", { timeout: 15000 }).should("be.visible");
  };

  // Uses journeyTenant (jones+clerk_test) to reduce overlap with offboarding
  // tests that use the regular tenant (smith+clerk_test). These tests must not
  // run concurrently with offboarding tests to avoid cross-test interference.
  const loginAsTenant = () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.visit("/");
    cy.contains("button", "Sign In", { timeout: 10000 }).should("be.visible");
    cy.clerkLogin({ userType: "journeyTenant" });
    cy.get(".cl-userButtonTrigger", { timeout: 15000 }).should("be.visible");
  };

  before(() => {
    // Clean up any leftover data from previous runs
    cy.task("cleanupTenantJourneyData");

    // Ensure landlord has a Stripe connected account for payment tests
    cy.task("ensureLandlordStripeAccount");

    // Create test property + unit
    cy.task("setupTenantJourneyTest").then((result) => {
      const data = result as { propertyId: number; unitId: number };
      unitId = data.unitId;
    });
  });

  beforeEach(() => {
    cy.viewport(1440, 900);
  });

  after(() => {
    cy.task("cleanupTenantJourneyData");
  });

  // ─── Journey 1: Viewing Request ────────────────────────────────────

  describe("Journey 1: Viewing Request", () => {
    it("tenant submits a viewing request", () => {
      loginAsTenant();
      cy.visit(`/units/${unitId}`);

      // Wait for the unit page to load
      cy.contains("Request Viewing", { timeout: 15000 }).should("be.visible");

      // Open viewing request modal
      cy.contains("button", "Request Viewing").click();
      cy.contains("Request a Viewing", { timeout: 10000 }).should(
        "be.visible"
      );

      // Fill in the form — name and email may be pre-filled, clear and re-type
      cy.get("#name").clear().type(testTenant.name);
      cy.get("#email").clear().type(testTenant.email);
      cy.get("#phone").clear().type(testTenant.phone);

      // Set preferred date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString("en-CA"); // YYYY-MM-DD
      cy.get("#preferredDate").type(dateStr);

      // Select preferred time
      cy.get("#preferredTime").select("Morning (9am-12pm)");

      // Add a message
      cy.get("#message").type(
        "I would like to schedule a viewing for this unit."
      );

      // Submit
      cy.contains("button", "Submit Request").click();

      // Assert success
      cy.contains("Request Submitted!", { timeout: 15000 }).should(
        "be.visible"
      );
      cy.contains("button", "Done").click();
    });

    it("landlord sees the viewing request", () => {
      loginAsLandlord();
      cy.visit("/my-properties?tab=inquiries");

      // Wait for the inquiries tab to load
      cy.contains("Viewing Requests", { timeout: 15000 }).should("be.visible");

      // Verify the viewing request card shows up
      cy.contains(testTenant.name, { timeout: 10000 }).should("be.visible");
      cy.contains(testTenant.email).should("be.visible");
      cy.contains("Pending").should("be.visible");
    });

    it("landlord approves the viewing request", () => {
      loginAsLandlord();
      cy.visit("/my-properties?tab=inquiries");

      // Wait for the inquiries tab to load
      cy.contains("Viewing Requests", { timeout: 15000 }).should("be.visible");

      // Click "Respond" on the pending viewing request card
      cy.contains(testTenant.name, { timeout: 10000 })
        .closest(".hover\\:shadow-md")
        .contains("button", "Respond")
        .click();

      // Response modal should open
      cy.contains("Viewing Request", { timeout: 10000 }).should("be.visible");
      cy.contains(testTenant.name).should("be.visible");
      cy.contains(testTenant.email).should("be.visible");

      // Add response notes
      cy.get("#notes").type("Looking forward to showing you the unit!");

      // Click Approve
      cy.contains("button", "Approve").click();

      // Toast should confirm approval
      cy.contains("Viewing request approved", { timeout: 10000 }).should(
        "be.visible"
      );

      // Verify the card now shows "Approved" status
      cy.contains("Approved", { timeout: 10000 }).should("be.visible");
    });
  });

  // ─── Journey 2: Contact & Messaging ────────────────────────────────

  describe("Journey 2: Contact & Messaging", () => {
    it("tenant contacts landlord from unit page", () => {
      loginAsTenant();
      cy.visit(`/units/${unitId}`);

      // Wait for the unit page to load
      cy.contains("Contact Landlord", { timeout: 15000 }).should("be.visible");

      // Open contact modal
      cy.contains("button", "Contact Landlord").click();
      cy.get('[role="dialog"]', { timeout: 10000 }).should("be.visible");

      // Subject is pre-filled, update it
      cy.get("#subject").clear().type("Question about Unit 101");

      // Type message
      cy.get("#message").type(
        "Hello, I am interested in this unit. Is it still available?"
      );

      // Send
      cy.contains("button", "Send Message").click();

      // Assert success
      cy.contains("Message Sent!", { timeout: 15000 }).should("be.visible");
      cy.contains("button", "Done").click();
    });

    it("tenant sees conversation in messages", () => {
      loginAsTenant();
      cy.visit("/messages");

      // Wait for messages page to load
      cy.contains("Messages", { timeout: 15000 }).should("be.visible");

      // Verify the conversation appears
      cy.contains("Question about Unit 101", { timeout: 10000 }).should(
        "be.visible"
      );
    });

    it("landlord receives and replies to message", () => {
      loginAsLandlord();
      cy.visit("/messages");

      // Wait for messages page to load
      cy.contains("Messages", { timeout: 15000 }).should("be.visible");

      // Click on the conversation with the tenant
      cy.contains("Question about Unit 101", { timeout: 10000 }).click();

      // Verify the tenant's message is visible
      cy.contains("Hello, I am interested in this unit.", {
        timeout: 10000,
      }).should("be.visible");

      // Reply
      cy.get('textarea[placeholder="Type a message..."]').type(
        "Yes, the unit is still available! When would you like to visit?"
      );
      cy.get('textarea[placeholder="Type a message..."]').type("{enter}");

      // Assert reply appears in the thread
      cy.contains("Yes, the unit is still available!", {
        timeout: 15000,
      }).should("be.visible");
    });

    it("tenant sees landlord's reply", () => {
      loginAsTenant();
      cy.visit("/messages");

      // Wait for messages page to load
      cy.contains("Messages", { timeout: 15000 }).should("be.visible");

      // Click on the conversation (after landlord replied, the last message
      // subject is "Re: Conversation", so find by the reply content instead)
      cy.contains("Yes, the unit is still available!", {
        timeout: 10000,
      }).click();

      // Both messages should be visible
      cy.contains("Hello, I am interested in this unit.", {
        timeout: 10000,
      }).should("be.visible");
      cy.contains("Yes, the unit is still available!", {
        timeout: 10000,
      }).should("be.visible");
    });
  });

  // ─── Journey 3: Tenancy Application ────────────────────────────────

  describe("Journey 3: Tenancy Application", () => {
    it("tenant submits a tenancy application", () => {
      loginAsTenant();
      cy.visit(`/units/${unitId}`);

      // Wait for the unit page to load
      cy.contains("Apply for Tenancy", { timeout: 15000 }).should(
        "be.visible"
      );

      // Open application modal
      cy.contains("button", "Apply for Tenancy").click();

      // Wait for modal to open — check for step-specific content
      // (avoid matching the page button text which is now behind the overlay)
      cy.contains("Personal Info", { timeout: 10000 }).should("be.visible");

      // ── Step 1: Personal Info ──
      cy.get("#firstName").clear().type("Test");
      cy.get("#lastName").clear().type("Tenant");
      cy.get("#email").clear().type(testTenant.email);
      cy.get("#phone").clear().type(testTenant.phone);
      cy.get("#dateOfBirth").clear().type("1990-01-15");
      cy.contains("button", "Continue").click();

      // ── Step 2: Employment ──
      cy.contains("Employment", { timeout: 10000 }).should("be.visible");
      cy.get("#employerName").clear().type("Cypress Corp");
      cy.get("#employerPhone").clear().type("(555) 111-2222");
      cy.get("#employerAddress")
        .clear()
        .type("456 Business Ave, George Town");
      cy.get("#employmentType").select("full_time");
      cy.get("#salary").clear().type("$5,000");
      cy.contains("button", "Continue").click();

      // ── Step 3: Proof of Address ──
      cy.contains("Proof of Address", { timeout: 10000 }).should("be.visible");
      cy.get("#proofOfAddress").selectFile(
        "cypress/fixtures/images/test-utility-bill.png",
        { force: true }
      );
      // Wait for upload to complete
      cy.contains("Uploaded:", { timeout: 30000 }).should("be.visible");
      cy.contains("button", "Continue").click();

      // ── Step 4: Emergency Contact ──
      cy.contains("Emergency Contact", { timeout: 10000 }).should(
        "be.visible"
      );
      cy.get("#emergencyContactName").clear().type("Jane Doe");
      cy.get("#emergencyContactRelationship").clear().type("Spouse");
      cy.get("#emergencyContactPhone").clear().type("(555) 333-4444");
      cy.contains("button", "Continue").click();

      // ── Step 5: Photo ID ──
      cy.contains("Photo ID", { timeout: 10000 }).should("be.visible");
      cy.get("#photoId").selectFile(
        "cypress/fixtures/images/test-user-id.png",
        { force: true }
      );
      // Wait for upload to complete
      cy.contains("Uploaded:", { timeout: 30000 }).should("be.visible");
      cy.contains("button", "Continue").click();

      // ── Step 6: Review & Submit ──
      cy.contains("Review & Submit", { timeout: 10000 }).should("be.visible");
      // Verify summary data
      cy.contains(testTenant.name).should("be.visible");
      cy.contains("Cypress Corp").should("be.visible");
      cy.contains("Jane Doe").should("be.visible");

      cy.contains("button", "Submit Application").click();

      // Assert success
      cy.contains("Application Submitted!", { timeout: 15000 }).should(
        "be.visible"
      );
      cy.contains("button", "Done").click();
    });

    it("landlord sees the application", () => {
      loginAsLandlord();
      cy.visit("/my-properties?tab=applications");

      // Wait for the applications tab to load
      cy.contains("Tenancy Applications", { timeout: 15000 }).should(
        "be.visible"
      );

      // Verify the application card shows up
      cy.contains(testTenant.email, { timeout: 10000 }).should(
        "be.visible"
      );
      cy.contains("Pending").should("be.visible");
    });

    it("landlord reviews and approves the application", () => {
      loginAsLandlord();
      cy.visit("/my-properties?tab=applications");

      // Wait for the applications tab to load
      cy.contains("Tenancy Applications", { timeout: 15000 }).should(
        "be.visible"
      );

      // Click "View Details" on the application card
      cy.contains(testTenant.email, { timeout: 10000 })
        .closest(".rounded-xl")
        .contains("button", "View Details")
        .click();

      // Review modal should open with applicant info
      cy.contains("Application Review", { timeout: 10000 }).should(
        "be.visible"
      );
      cy.contains(testTenant.email).should("be.visible");

      // Wait for application details to load (shows Personal tab by default)
      cy.contains("First Name", { timeout: 10000 }).should("be.visible");
      cy.contains("Test").should("be.visible");

      // Scope all interactions to the dialog (force: true needed — radix
      // dialog scroll-lock sets pointer-events:none on body; scoping to
      // [role="dialog"] avoids clicking identically-named dashboard tabs)
      cy.get('[role="dialog"]').within(() => {
        // Check Employment tab
        cy.contains("button", "Employment").click({ force: true });
        cy.contains("Cypress Corp", { timeout: 10000 }).should("be.visible");

        // Check Emergency tab
        cy.contains("button", "Emergency").click({ force: true });
        cy.contains("Jane Doe", { timeout: 10000 }).should("be.visible");

        // Check Documents tab
        cy.contains("button", "Documents").click({ force: true });
        cy.contains("Proof of Address", { timeout: 10000 }).should(
          "be.visible"
        );
        cy.contains("Photo ID").should("be.visible");
      });

      // Approve if still pending (on retry the approval may have already
      // gone through so #decisionNotes won't exist)
      cy.get("body").then(($body) => {
        if ($body.find("#decisionNotes").length > 0) {
          cy.get("#decisionNotes").type("Application looks great. Approved!", {
            force: true,
          });
          // Select rent due day
          cy.get("#rentDueDay").select("1", { force: true });
          cy.get('[role="dialog"]')
            .contains("button", "Approve")
            .click({ force: true });
        }
      });

      // Modal should close and card should show approved status
      cy.contains("Application Review", { timeout: 10000 }).should(
        "not.exist"
      );
      cy.contains("Approved", { timeout: 10000 }).should("be.visible");
    });
  });

  // ─── Journey 4: Move-In Payment (via approval) ─────────────────

  describe("Journey 4: Move-In Payment", () => {
    it("tenant completes move-in payment with test card", () => {
      loginAsTenant();

      // Intercept the payment API to capture the PaymentIntent ID
      cy.intercept("POST", "/api/tenant/payments").as("createPayment");

      // Navigate to tenant dashboard (lease + payment created on approval)
      cy.visit("/dashboard");
      cy.contains("Welcome back", { timeout: 15000 }).should("be.visible");

      // Click the Payments tab
      cy.contains('[role="tab"]', "Payments").click();

      // Verify the move-in payment is visible and click Pay
      cy.contains("Move-In payment", { timeout: 10000 }).should("be.visible");
      cy.contains("button", "Pay Move-In").click();

      // Wait for payment modal to open
      cy.get('[role="dialog"]', { timeout: 15000 }).should("be.visible");
      cy.contains("Complete Payment", { timeout: 10000 }).should("be.visible");

      // Wait for the API to create the PaymentIntent, then confirm it
      // server-side with pm_card_visa (bypasses flaky Stripe iframe filling)
      cy.wait("@createPayment")
        .its("response.body")
        .then((body: { paymentIntentId: string }) => {
          cy.log(`Confirming PaymentIntent: ${body.paymentIntentId}`);
          cy.task("confirmPaymentIntent", body.paymentIntentId);
        });

      // Close the modal using Escape key (the React component is still
      // waiting on stripe.confirmPayment which will never resolve)
      cy.get("body").type("{esc}");
      cy.get('[role="dialog"]', { timeout: 5000 }).should("not.exist");

      // Wait for the Stripe webhook to update the payment status
      cy.wait(3000);

      // Reload to see the updated payment status
      cy.reload();
      cy.contains("Welcome back", { timeout: 15000 }).should("be.visible");
      cy.contains('[role="tab"]', "Payments").click();

      // Verify billing history shows the confirmed payment
      cy.contains("Billing History").should("be.visible");
      cy.get("table").within(() => {
        cy.contains("Move-In").should("be.visible");
      });
    });
  });
});
