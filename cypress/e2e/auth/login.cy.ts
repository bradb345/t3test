describe("Authentication", () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit("/");
  });

  describe("Login Flow", () => {
    it("should display the sign in button when not authenticated", () => {
      cy.contains("button", "Sign In").should("be.visible");
    });

    it("should open Clerk modal when clicking Sign In", () => {
      cy.contains("button", "Sign In").click();
      
      // Clerk modal should appear
      cy.get(".cl-card").should("be.visible");
    });

    it("should successfully login with valid credentials", () => {
      // Use custom login command with landlord user
      cy.clerkLogin({ userType: "landlord" });

      // After successful login, user button should be visible instead of Sign In
      cy.get(".cl-userButtonTrigger", { timeout: 15000 }).should("be.visible");
      
      // Sign In button should no longer be visible
      cy.contains("button", "Sign In").should("not.exist");
    });

    it("should show error message with invalid credentials", () => {
      // Click Sign In to open modal
      cy.contains("button", "Sign In").click();
      
      // Wait for modal
      cy.get(".cl-card").should("be.visible");
      
      // Enter invalid email
      cy.get('input[name="identifier"]').type("invalid@example.com");
      cy.contains("button", "Continue").click();
      
      // Should show an error message
      cy.get(".cl-formFieldErrorText", { timeout: 10000 }).should("be.visible");
    });
  });

  describe("Protected Routes", () => {
    it("should redirect to login when accessing protected route while unauthenticated", () => {
      cy.visit("/my-properties");
      
      // Should be redirected or shown sign-in prompt
      cy.url().should("not.include", "/my-properties");
    });

    it("should allow access to protected routes after login", () => {
      // Login first with landlord user
      cy.clerkLogin({ userType: "landlord" });
      
      // Wait for authentication to complete
      cy.get(".cl-userButtonTrigger", { timeout: 15000 }).should("be.visible");
      
      // Now navigate to protected route
      cy.visit("/my-properties");
      
      // Should be able to access the page
      cy.url().should("include", "/my-properties");
    });
  });
});
