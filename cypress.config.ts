import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    video: false,
    screenshotOnRunFailure: false,
    // The chat test waits on a real model answer, which is the slowest thing
    // in the suite by a wide margin.
    defaultCommandTimeout: 15_000,
    responseTimeout: 60_000,
    retries: { runMode: 1, openMode: 0 },
  },
});
