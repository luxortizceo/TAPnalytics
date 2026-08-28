import { test, expect } from "@playwright/test";

test.describe("Public marketing site", () => {
  test("homepage renders the hero and brand", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/TAPnalytics/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("skip link is keyboard-reachable and jumps to main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("Saltar al contenido principal");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
  });

  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  test("pricing page shows an honest fallback when Supabase isn't configured", async ({ page }) => {
    test.skip(hasSupabase, "This project has a live Supabase project connected — see the test below instead.");
    await page.goto("/precios");
    await expect(page.getByText(/No pudimos cargar los planes/i)).toBeVisible();
  });

  test("pricing page shows real plans when Supabase is connected", async ({ page }) => {
    test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL — see the fallback test above instead.");
    await page.goto("/precios");
    await expect(page.getByText(/No pudimos cargar los planes/i)).not.toBeVisible();
    await expect(page.getByText(/días de prueba gratuita/i).first()).toBeVisible();
  });

  test.describe("legal pages", () => {
    for (const path of ["/legal/privacidad", "/legal/terminos", "/legal/cookies"]) {
      test(`${path} renders`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBeLessThan(400);
      });
    }
  });

  test("unknown route returns a not-found page", async ({ page }) => {
    const response = await page.goto("/esto-no-existe-nunca");
    expect(response?.status()).toBe(404);
  });
});
