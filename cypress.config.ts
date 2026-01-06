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
    // Retry settings for better stability in headless mode
    retries: {
      runMode: 2, // Retry failed tests up to 2 times in headless mode
      openMode: 0, // No retries in interactive mode
    },
    // Increase page load timeout for slower CI environments
    pageLoadTimeout: 60000,
    // Disable test isolation to preserve state between tests in the same spec
    testIsolation: false,
  },
});
