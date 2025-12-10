/// <reference types="cypress" />

// Test user credentials
const TEST_USERS = {
  landlord: {
    email: "doe+clerk_test@example.com",
    password: "RikGA8xSh5teC@4Y",
  },
} as const;

type UserType = keyof typeof TEST_USERS;

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login via Clerk modal
       * @param options - Login options
       * @param options.userType - Type of user to login as (default: 'landlord')
       */
      clerkLogin(options?: { userType?: UserType }): Chainable<void>;
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

  cy.wait(3000); // Small wait to ensure session is fully established
});

export {};
