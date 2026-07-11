// E2E config — mirrors civic-hub's Playwright setup. The live /events
// endpoints are MOCKED inside the tests (page.route), so no Hub or Rep
// Space server is required; only the Vite dev server boots.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5175",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npx vite --port 5175 --strictPort",
    url: "http://localhost:5175",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
