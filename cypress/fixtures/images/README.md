# Cypress Test Fixtures - Images

Place your test images in this folder for the property and unit management E2E tests.

## Required Images

The following images are required for the `property-management.cy.ts` test:

### 1. `property-image.jpg`
- **Purpose**: Property listing photo
- **Used in**: Property creation step 2 (Property Details)
- **Description**: An image of a property building, exterior, or common area

### 2. `unit-image.jpg`
- **Purpose**: Unit interior photo
- **Used in**: Unit creation step 2 (Photos & Details)
- **Description**: An image of a unit interior (living room, bedroom, kitchen, etc.)

### 3. `floor-plan.jpg`
- **Purpose**: Unit floor plan
- **Used in**: Unit creation step 2 (Photos & Details)
- **Description**: A floor plan image showing the layout of the unit

## Image Requirements

- **Format**: JPEG (.jpg) recommended, but PNG also works
- **Size**: Keep images under 5MB for faster test execution
- **Dimensions**: Any reasonable dimension (e.g., 800x600 or 1200x800)

## Example

You can use any placeholder images. Here are some options:
- Take screenshots from property listing websites
- Use free stock photos from Unsplash or Pexels
- Create simple placeholder images

## File Structure

```
cypress/
└── fixtures/
    └── images/
        ├── property-image.jpg
        ├── unit-image.jpg
        └── floor-plan.jpg
```
