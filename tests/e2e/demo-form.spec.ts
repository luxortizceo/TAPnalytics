import { test, expect } from "@playwright/test";

// requestDemo() only validates with Zod and optionally sends an email via
// Resend (skipped gracefully when RESEND_API_KEY isn't set) — no database
// involved, so this is fully exercisable without a live Supabase project.
test.describe("/demo request form", () => {
  test("shows field errors when required fields are missing", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: "Solicitar demostración" }).click();
    await expect(page.getByText("Ingresa tu nombre")).toBeVisible();
    await expect(page.getByText("Ingresa el nombre de tu empresa")).toBeVisible();
    await expect(page.getByText("Correo inválido")).toBeVisible();
  });

  test("succeeds with valid data and shows a confirmation", async ({ page }) => {
    await page.goto("/demo");
    await page.getByLabel("Nombre completo").fill("Ana Torres");
    await page.getByLabel("Empresa").fill("Café Central");
    await page.getByLabel("Correo de trabajo").fill("ana@cafecentral.mx");
    await page.getByRole("button", { name: "Solicitar demostración" }).click();
    await expect(page.getByRole("status")).toContainText("Gracias");
  });
});
