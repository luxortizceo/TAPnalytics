import { defineConfig, devices } from "@playwright/test";

/**
 * Covers only what doesn't need a live Supabase project — this environment
 * has none connected (see README/docs/architecture.md). Public marketing
 * pages, auth page rendering, and client-side validation are fair game;
 * anything that submits a Server Action touching the database is not.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Set PLAYWRIGHT_CHROMIUM_EXECUTABLE if your environment provides a
        // pre-installed Chromium under a different revision than this
        // repo's pinned @playwright/test expects (e.g. a sandboxed CI
        // image) — avoids a `playwright install` download. Unset by
        // default: normal `npx playwright install` still works everywhere
        // else.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : undefined,
      },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
