/// <reference types="cypress" />

/**
 * Property and Unit Management E2E Tests
 *
 * This test suite covers the complete property management workflow:
 * 1. Create a new property with images
 * 2. Create a unit for that property with images and floor plan
 * 3. Duplicate the unit
 * 4. Delete the duplicated unit
 * 5. Delete the property (which cascades to delete remaining unit)
 */

describe("Property and Unit Management", () => {
  // Store created IDs for use across tests
  let createdPropertyId: number;
  let duplicatedUnitId: number;

  // Test property data
  const testProperty = {
    name: `Cypress Test Property ${Date.now()}`,
    address: "123 Main Street, Los Angeles, CA, USA",
    yearBuilt: "2020",
    propertyType: "apartment",
    amenities: ["Pool", "Gym", "Parking"],
    description: "A beautiful test property created by Cypress E2E tests.",
  };

  // Test unit data
  const testUnit = {
    unitNumber: "1",
    numBedrooms: "2",
    numBathrooms: "1.5",
    squareFeet: "850",
    monthlyRent: "2500",
    deposit: "5000",
    features: ["Hardwood Floors", "Balcony", "In-unit Laundry"],
    description:
      "A lovely unit with great views, created by Cypress E2E tests.",
  };

  beforeEach(() => {
    // Visit homepage and login once before all tests
    cy.viewport(1440, 900);
    cy.visit("/");
    cy.clerkLogin({ userType: "landlord" });

    // Wait for authentication to complete
    cy.get(".cl-userButtonTrigger", { timeout: 15000 }).should("be.visible");
  });

  it("1. should create a new property with images", () => {
    // Navigate to My Properties via nav link
    cy.contains("a", "My Properties").click();

    // Verify we're on the My Properties page
    cy.url().should("include", "/my-properties");
    cy.contains("h1", "My Properties").should("be.visible");

    // Click Add New Property button
    cy.contains("button", "Add New Property").click({ force: true });

    // Verify we're on the property creation page
    cy.url().should("include", "/list-property/create");

    // === Step 1: Basic Information ===
    cy.contains("h2", "Basic Information").should("be.visible");

    // Fill in property name
    cy.get('input[placeholder="e.g., Sunset Towers"]').type(testProperty.name);

    // Fill in address using LocationInput component
    cy.get('input[placeholder="Enter address..."]')
      .type(testProperty.address, { delay: 50 });

    // Wait for autocomplete dropdown and select first option
    cy.get('[role="listbox"]', { timeout: 10000 })
      .find('[role="option"]')
      .first()
      .click();

    // Fill in year built
    cy.get('input[placeholder="e.g., 2020"]').type(testProperty.yearBuilt);

    // Select property type
    cy.get("select").select(testProperty.propertyType);

    // Select amenities using MultiSelect
    cy.get(".multi-select-container").first().within(() => {
      cy.get("input").click();
    });
    testProperty.amenities.forEach((amenity) => {
      cy.contains("[cmdk-item]", amenity).click();
    });
    // Close the multi-select by clicking outside
    cy.get("body").click(0, 0);

    // Click Next button
    cy.contains("button", "Next").should("not.be.disabled").click();

    // === Step 2: Property Details ===
    cy.contains("h2", "Property Details").should("be.visible");

    // Fill in description
    cy.get('textarea[placeholder="Describe your property..."]').type(
      testProperty.description
    );

    // Upload property image
    cy.get('input[type="file"][accept="image/*"]').selectFile(
      "cypress/fixtures/images/property-image.jpg",
      { force: true }
    );

    // Wait for upload to complete - image thumbnail should appear
    cy.get('img[alt="Upload 1"]', { timeout: 30000 }).should("be.visible");

    // Submit the form
    cy.contains("button", "Create Listing").click();

    // Wait for success toast and redirect
    cy.contains("Property created successfully", { timeout: 15000 }).should(
      "be.visible"
    );

    // Verify we're redirected to my-properties
    cy.url().should("include", "/my-properties");

    // === Verify Property Created ===
    cy.contains("h3", testProperty.name).should("be.visible");

    // Click on View Details to go to property page
    cy.contains("h3", testProperty.name)
      .closest(".overflow-hidden")
      .contains("View Details")
      .click();

    // Verify we're on the property detail page
    cy.contains("h1", testProperty.name).should("be.visible");

    // Extract property ID from URL for later use
    cy.url().then((url) => {
      const regex = /\/my-properties\/(\d+)/;
      const match = regex.exec(url);
      if (match?.[1]) {
        createdPropertyId = parseInt(match[1]);
        cy.log(`Created Property ID: ${createdPropertyId}`);
      }
    });
  });

  it("2. should create a new unit with images and floor plan", () => {
    // Navigate to property page (in case we're not there)
    cy.visit("/my-properties");
    cy.contains("h3", testProperty.name).should("be.visible");
    cy.contains("h3", testProperty.name)
      .closest(".overflow-hidden")
      .contains("View Details")
      .click();

    // Make sure we're on the property detail page
    cy.contains("h2", "Units").should("be.visible");

    // Click Add New Unit
    cy.contains("a", "Add New Unit").click();

    // Verify we're on the unit creation page
    cy.url().should("include", "/units/create");

    // === Step 1: Unit Basic Information ===
    cy.contains("h2", "Basic Information").should("be.visible");

    // Fill in unit number
    cy.get('input[placeholder="e.g., 4B or 101"]').type(testUnit.unitNumber);

    // Fill in bedrooms
    cy.get('input[placeholder="e.g., 2"]').type(testUnit.numBedrooms);

    // Fill in bathrooms
    cy.get('input[placeholder="e.g., 1.5"]').type(testUnit.numBathrooms);

    // Fill in square feet
    cy.get('input[placeholder="e.g., 850"]').type(testUnit.squareFeet);

    // Fill in monthly rent
    cy.get('input[placeholder="e.g., 2500"]').type(testUnit.monthlyRent);

    // Fill in security deposit
    cy.get('input[placeholder="e.g., 5000"]').type(testUnit.deposit);

    // Check availability checkbox (should be checked by default)
    cy.get("input#isAvailable").should("be.checked");

    // Select features using MultiSelect
    cy.get(".multi-select-container").first().within(() => {
      cy.get("input").click();
    });
    testUnit.features.forEach((feature) => {
      cy.contains("[cmdk-item]", feature).click();
    });
    // Close the multi-select
    cy.get("body").click(0, 0);

    // Click Next button
    cy.contains("button", "Next").should("not.be.disabled").click();

    // === Step 2: Photos & Details ===
    cy.contains("h2", "Photos & Details").should("be.visible");

    // Fill in description
    cy.get('textarea[placeholder="Describe this unit..."]').type(
      testUnit.description
    );

    // Upload unit images (first file input - for unit photos)
    cy.get('input[type="file"][accept="image/*"]')
      .first()
      .selectFile("cypress/fixtures/images/unit-image.jpg", { force: true });

    // Wait for unit image upload to complete
    cy.get('img[alt="Upload 1"]', { timeout: 30000 }).should("be.visible");

    // Upload floor plan (second file input)
    cy.get('input[type="file"][accept="image/*"]')
      .eq(1)
      .selectFile("cypress/fixtures/images/floor-plan.jpg", { force: true });

    // Wait for floor plan upload to complete
    cy.get('img[alt="Floor plan 1"]', { timeout: 30000 }).should("be.visible");

    // Submit the form
    cy.contains("button", "Create Unit").click();

    // Wait for success toast and redirect
    cy.contains("Unit created successfully", { timeout: 15000 }).should(
      "be.visible"
    );

    // Verify we're redirected back to property page
    cy.url().should("match", /\/my-properties\/\d+$/);

    // === Verify Unit Created ===
    cy.contains("h3", `Unit ${testUnit.unitNumber}`).should("be.visible");

    // Verify unit shows as Vacant
    cy.contains(`Unit ${testUnit.unitNumber}`)
      .closest(".p-6")
      .contains("Vacant")
      .should("be.visible");
  });

  it("3. should duplicate the unit and verify both exist", () => {
    // Navigate to property page (in case we're not there)
    cy.visit("/my-properties");
    cy.contains("h3", testProperty.name).should("be.visible");
    cy.contains("h3", testProperty.name)
      .closest(".overflow-hidden")
      .contains("View Details")
      .click();

    // Wait for units to load
    cy.contains("h3", `Unit ${testUnit.unitNumber}`).should("be.visible");

    // Find the unit card and open dropdown
    cy.contains("h3", `Unit ${testUnit.unitNumber}`)
      .closest(".p-6")
      .find('[class*="DropdownMenuTrigger"], button:has(svg)')
      .last()
      .click();

    // Click Duplicate option
    cy.contains("Duplicate").click();

    // Wait for confirmation dialog (AlertDialog)
    cy.get('[role="alertdialog"]', { timeout: 10000 }).should("be.visible");
    cy.contains(`Duplicate Unit ${testUnit.unitNumber}?`).should("be.visible");

    // Confirm duplication by clicking the Duplicate button in the dialog
    cy.get('[role="alertdialog"]').contains("button", "Duplicate").click();


    // After duplication, user is redirected to edit the new unit
    cy.url({ timeout: 15000 }).should("include", "/edit");

    // Extract duplicated unit ID from URL
    cy.url().then((url) => {
      const regex = /\/units\/(\d+)\/edit/;
      const match = regex.exec(url);
      if (match?.[1]) {
        duplicatedUnitId = parseInt(match[1]);
        cy.log(`Duplicated Unit ID: ${duplicatedUnitId}`);
      }
    });

    // === Edit the duplicated unit ===
    // Step 1: Update unit number to "2"
    cy.contains("h2", "Basic Information").should("be.visible");

    // Clear the existing unit number and enter "2"
    cy.get('input[placeholder="e.g., 4B or 101"]').clear().type("2");

    // Click Next button to proceed to Photos & Details
    cy.contains("button", "Next").should("not.be.disabled").click();

    // === Step 2: Photos & Details ===
    cy.contains("h2", "Photos & Details").should("be.visible");

    // Upload unit images (same as initial unit upload)
    cy.get('input[type="file"][accept="image/*"]')
      .first()
      .selectFile("cypress/fixtures/images/unit-image.jpg", { force: true });

    // Wait for unit image upload to complete
    cy.get('img[alt="Upload 1"]', { timeout: 30000 }).should("be.visible");

    // Upload floor plan (same as initial unit upload)
    cy.get('input[type="file"][accept="image/*"]')
      .eq(1)
      .selectFile("cypress/fixtures/images/floor-plan.jpg", { force: true });

    // Wait for floor plan upload to complete
    cy.get('img[alt="Floor plan 1"]', { timeout: 30000 }).should("be.visible");

    // Submit the form to save the duplicated unit
    cy.contains("button", "Update Unit").click();

    // Wait for success toast
    cy.contains("Unit updated successfully", { timeout: 15000 }).should(
      "be.visible"
    );

    // Verify we're redirected back to property page
    cy.url({ timeout: 10000 }).should("match", /\/my-properties\/\d+$/);

    // Verify both units exist on the property page
    cy.contains("h3", `Unit ${testUnit.unitNumber}`).should("be.visible");
    cy.contains("h3", "Unit 2").should("be.visible");

    // There should be two unit cards now (original and duplicate)
    cy.get(".p-6").should("have.length.at.least", 2);
  });

  it("4. should delete the duplicated unit", () => {
    // Navigate to property page (in case we're not there)
    cy.visit("/my-properties");
    cy.contains("h3", testProperty.name).should("be.visible");
    cy.contains("h3", testProperty.name)
      .closest(".overflow-hidden")
      .contains("View Details")
      .click();

    // Wait for units to load - there should be 2
    cy.get(".p-6").should("have.length.at.least", 2);

    // Find the duplicated unit (Unit 2) and open its dropdown
    cy.contains("h3", "Unit 2")
      .closest(".p-6")
      .within(() => {
        // Open dropdown menu
        cy.get("button").last().click();
      });

    // Click Delete option
    cy.contains("Delete").click();

    // Wait for delete confirmation dialog
    cy.contains("Delete Unit").should("be.visible");

    // Confirm deletion
    cy.get('[role="alertdialog"]').contains("button", "Delete").click();

    // Verify only one unit card remains
    cy.contains("h3", `Unit ${testUnit.unitNumber}`).should("be.visible");
    cy.get(".p-6").filter(":contains('Unit')").should("have.length", 1);
  });

  it("5. should delete the property and verify it no longer exists", () => {
    // Navigate back to My Properties page
    cy.visit("/my-properties");

    // Verify we're on the My Properties page
    cy.url().should("include", "/my-properties");

    // Find the property card
    cy.contains("h3", testProperty.name).should("be.visible");

    // Open the dropdown menu on the property card
    cy.contains("h3", testProperty.name)
      .closest(".overflow-hidden")
      .find("button")
      .first() // The dropdown trigger is the first button
      .click();

    // Click Delete option
    cy.contains("Delete").click();

    // Wait for delete confirmation dialog
    cy.contains("Are you absolutely sure?").should("be.visible");
    cy.contains(
      "This will permanently delete your property and all associated units"
    ).should("be.visible");

    // Confirm deletion
    cy.get('[role="alertdialog"]').contains("button", "Delete").click();

    // Wait for success toast
    cy.contains("Property deleted successfully", { timeout: 15000 }).should(
      "be.visible"
    );

    // The property card should no longer be visible
    cy.contains("h3", testProperty.name).should("not.exist");
  });
});
