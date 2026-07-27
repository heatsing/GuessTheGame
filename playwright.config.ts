import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config. E2E tests live in `e2e/` and run against the PRODUCTION
 * static export (`out/`), not the dev server — so e2e validates the actual
 * shipped artifact (P2-33). The webServer builds once, then serves `out/` via
 * the zero-dependency `scripts/serve-static.mjs` (Node builtins only, so no
 * new dependency is required). Tests cover runtime behavior: keyboard
 * operability, 404, and server-rendered content.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Build the static export, then serve it. `reuseExistingServer` lets a
    // locally-running server be reused to speed up iteration; in CI a fresh
    // build+serve is always started.
    command: "npm run build && npm run serve:static",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
