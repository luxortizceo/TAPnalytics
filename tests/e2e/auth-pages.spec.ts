import { test, expect } from "@playwright/test";

// Render-only: submitting these forms invokes a Server Action that calls
// Supabase Auth, which isn't connected in this environment (see
// docs/architecture.md). Verifying the form itself renders correctly and
// is keyboard/label-accessible is still meaningful on its own.
test.describe("Auth pages render correctly", () => {
  test("/login has an accessible email/password form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /comienza tu prueba gratuita/i })).toBeVisible();
  });

  test("/registro has an accessible sign-up form", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.getByLabel(/nombre completo/i)).toBeVisible();
    await expect(page.getByLabel(/correo/i).first()).toBeVisible();
  });

  test("/recuperar renders a password-reset request form", async ({ page }) => {
    await page.goto("/recuperar");
    await expect(page.getByLabel(/correo/i)).toBeVisible();
  });
});
