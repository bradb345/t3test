describe("Signup Flow", () => {
  beforeEach(() => {
    // Clear all session data to ensure fresh unauthenticated state
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();

    // Visit the homepage before each test
    cy.visit("/");

    // Wait for the page to fully load and auth state to settle
    cy.get("body").should("be.visible");
  });

  it("should display sign up option in Clerk modal", () => {
    // Open the Clerk modal
    cy.contains("button", "Sign In").click();
    cy.get(".cl-card").should("be.visible");

    // Verify "Sign up" footer link exists in the Clerk modal
    cy.get(".cl-footerActionLink", { timeout: 10000 }).should("be.visible");
  });

  it("should successfully sign up with a new test email", () => {
    // Generate unique test email using Clerk test mode pattern
    const randomId = Date.now();
    const testEmail = `test${randomId}+clerk_test@example.com`;
    const testPassword = "m8QiMzxkx5!&c#9T";

    // Open the Clerk modal
    cy.contains("button", "Sign In").click();
    cy.get(".cl-card").should("be.visible");

    // Switch to sign up form via Clerk's footer link
    cy.get(".cl-footerActionLink", { timeout: 10000 }).click();

    // Wait for the sign up form to appear
    cy.get('input[name="firstName"]', { timeout: 10000 }).should("be.visible");

    // Fill in the sign up form
    cy.get('input[name="firstName"]').type("Test");
    cy.get('input[name="lastName"]').type("User");
    cy.get('input[name="emailAddress"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);

    // Submit the sign up form
    cy.get(".cl-formButtonPrimary").click();

    // Handle email verification - Clerk test mode uses code 424242
    // Clerk's OTP field renders divs as digit slots; click the container to focus the hidden input
    cy.get("[class*='cl-otpCodeField']", { timeout: 15000 }).should("be.visible");
    cy.get("[class*='cl-otpCodeField']").first().click().type("424242");


    // Verify signup succeeded - Clerk modal should close and user should be authenticated
    cy.get(".cl-card", { timeout: 15000 }).should("not.exist");
    cy.contains("button", "Sign In").should("not.exist");
  });

  it("should show the new user is authenticated after signup", () => {
    // Generate unique test email
    const randomId = Date.now();
    const testEmail = `test${randomId}+clerk_test@example.com`;
    const testPassword = "m8QiMzxkx5!&c#9T";

    // Open the Clerk modal and switch to sign up
    cy.contains("button", "Sign In").click();
    cy.get(".cl-card").should("be.visible");
    cy.get(".cl-footerActionLink", { timeout: 10000 }).click();

    // Fill in the sign up form
    cy.get('input[name="firstName"]', { timeout: 10000 }).should("be.visible");
    cy.get('input[name="firstName"]').type("Test");
    cy.get('input[name="lastName"]').type("User");
    cy.get('input[name="emailAddress"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);

    // Submit and verify
    cy.get(".cl-formButtonPrimary").click();
    cy.get("[class*='cl-otpCodeField']", { timeout: 15000 }).should("be.visible");
    cy.get("[class*='cl-otpCodeField']").first().click().type("424242");

    // After signup, verify authenticated state
    cy.get(".cl-card", { timeout: 15000 }).should("not.exist");
    cy.contains("button", "Sign In").should("not.exist");
  });
});
