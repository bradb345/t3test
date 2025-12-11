import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on, config) {
      // implement node event listeners here
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
  },
});
