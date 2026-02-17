/// <reference types="cypress" />

// Test user credentials
const TEST_USERS = {
  landlord: {
    email: "doe+clerk_test@example.com",
    password: "RikGA8xSh5teC@4Y",
  },
  tenant: {
    email: "smith+clerk_test@example.com",
    password: "m8QiMzxkx5!&c#9T",
  },
  journeyTenant: {
    email: "jones+clerk_test@example.com",
    password: "Kx9$mPvR2wL!nQ7j",
  },
} as const;

type UserType = keyof typeof TEST_USERS;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login via Clerk modal
       * @param options - Login options
       * @param options.userType - Type of user to login as (default: 'landlord')
       */
      clerkLogin(options?: { userType?: UserType }): Chainable<void>;

      /**
       * Fill the Stripe PaymentElement with test card data (4242 4242 4242 4242).
       * Must be called when a dialog containing Stripe iframes is visible.
       */
      fillStripePaymentElement(): Chainable<void>;
    }
  }
}

/**
 * Custom command to handle Clerk authentication via modal
 */
Cypress.Commands.add("clerkLogin", (options?: { userType?: UserType }) => {
  const userType = options?.userType ?? "landlord";
  const { email, password } = TEST_USERS[userType];
  // Click the Sign In button to open the Clerk modal
  cy.contains("button", "Sign In").click();

  // Wait for Clerk modal to appear and enter email
  cy.get(".cl-card").should("be.visible");

  // Enter email in Clerk's email input field
  cy.get('input[name="identifier"]').type(email);

  // Click continue button
  cy.contains("button", "Continue").click();

  // Wait for password field and enter password
  cy.get('input[name="password"]', { timeout: 10000 }).should("be.visible").type(password);

  // Click the continue/sign in button
  cy.contains("button", "Continue").click();

  // Wait for successful authentication - modal should close
  cy.get(".cl-card", { timeout: 15000 }).should("not.exist");

});

/**
 * Helper: find the Stripe PaymentElement iframe body (the one with inputs).
 * Returns a fresh HTMLElement each call to avoid stale references after
 * Stripe re-renders the form.
 */
function getStripePaymentBody(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .get('[role="dialog"] iframe[name^="__privateStripeFrame"]')
    .then(($iframes) => {
      for (const el of Array.from($iframes)) {
        const frame = el as HTMLIFrameElement;
        const body = frame.contentDocument?.body;
        if (body && body.querySelectorAll("input").length > 0) {
          return cy.wrap(Cypress.$(body));
        }
      }
      throw new Error("Could not find Stripe iframe with input elements");
    });
}

/**
 * Custom command to fill the Stripe PaymentElement with test card details.
 *
 * Strategy: re-query the iframe body before each field to avoid stale
 * references (Stripe re-renders after each input).
 */
Cypress.Commands.add("fillStripePaymentElement", () => {
  // Wait for Stripe iframes to load inside the dialog
  cy.get('[role="dialog"]', { timeout: 15000 }).should("be.visible");
  cy.get('[role="dialog"] iframe[name^="__privateStripeFrame"]', {
    timeout: 30000,
  }).should("have.length.greaterThan", 0);

  // Wait for Stripe to fully initialize
  cy.wait(3000);

  // Card number
  getStripePaymentBody().find('input[name="number"]').as("cardNumber");
  cy.get("@cardNumber").click({ force: true });
  cy.get("@cardNumber").type("4242424242424242", { force: true, delay: 50 });
  cy.wait(500);

  // Expiry
  getStripePaymentBody().find('input[name="expiry"]').as("expiry");
  cy.get("@expiry").click({ force: true });
  cy.get("@expiry").type("1234", { force: true, delay: 50 });
  cy.wait(300);

  // CVC
  getStripePaymentBody().find('input[name="cvc"]').as("cvc");
  cy.get("@cvc").click({ force: true });
  cy.get("@cvc").type("123", { force: true, delay: 50 });
  cy.wait(300);

  // Country — select US
  getStripePaymentBody()
    .find('select[name="country"]')
    .then(($select) => {
      if ($select.length > 0 && $select.val() !== "US") {
        cy.wrap($select).select("US", { force: true });
        cy.wait(500);
      }
    });

  // Postal code — find by name containing "postal" or "zip"
  getStripePaymentBody()
    .find("input")
    .then(($inputs) => {
      for (const el of Array.from($inputs)) {
        const name = el.getAttribute("name") ?? "";
        const ac = el.getAttribute("autocomplete") ?? "";
        if (
          name.includes("postal") ||
          name.includes("zip") ||
          ac.includes("postal")
        ) {
          cy.wrap(el)
            .click({ force: true })
            .clear({ force: true })
            .type("10001", { force: true, delay: 50 });
          break;
        }
      }
    });
});

export {};
