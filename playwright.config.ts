import { defineConfig, devices } from "@playwright/test";

// Next.js loads .env.local automatically for the app server (see the
// webServer command below), but the Playwright test runner is a separate
// Node process that doesn't — load it here too so tests/e2e/full-flow.spec.ts
// can see NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY and skip itself
// correctly instead of always skipping. No-op if the file doesn't exist
// (e.g. CI without a live Supabase project).
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local not present — fine, env-dependent tests skip themselves.
}

/**
 * Most of this suite deliberately avoids needing a live Supabase project —
 * public marketing pages, auth page rendering, and client-side validation
 * are fair game without one; anything that submits a Server Action touching
 * the database is not, so `npm run test:e2e` still passes in an environment
 * with no project connected (e.g. a fresh clone before `supabase` setup).
 * tests/e2e/full-flow.spec.ts is the one exception — it exercises the real
 * database end-to-end and skips itself when the required env vars are
 * missing instead of failing.
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
