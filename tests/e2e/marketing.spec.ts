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

  test("pricing page shows an honest fallback when Supabase isn't configured", async ({ page }) => {
    await page.goto("/precios");
    await expect(page.getByText(/No pudimos cargar los planes/i)).toBeVisible();
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
