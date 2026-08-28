import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Covers the same class of bug as tests/e2e/team-invite.spec.ts:
// requestPasswordReset() in app/(auth)/actions.ts used to redirect
// straight to /restablecer, but this project's Supabase instance has no
// custom SMTP configured, so Supabase's default (non-editable) email
// templates put the session in the URL *fragment* (#access_token=...)
// instead of a ?token_hash=... query param — and /restablecer has no
// session-handling logic of its own. The link now routes through
// /auth/confirm?next=/restablecer, which does.
//
// Requires a live Supabase project (same env vars as full-flow.spec.ts);
// skips itself otherwise. Creates and tears down its own user.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("Forgot-password recovery link", () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY,
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );

  let admin: SupabaseClient;
  const email = `e2e-reset-${Date.now()}@tapnalytics.test`;
  const oldPassword = `Old${Date.now()}Aa!`;
  const newPassword = `New${Date.now()}Aa!`;
  let userId = "";

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: oldPassword,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
    userId = data.user.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test("resolves the recovery link's session and lets the user set a new password", async ({ page, baseURL }) => {
    // redirectTo matches exactly what requestPasswordReset() passes in
    // production — a mismatch here would let this test pass while the
    // real "forgot password" flow stays broken.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${baseURL}/auth/confirm?next=/restablecer` },
    });
    if (linkError || !linkData) throw new Error(`No se pudo generar el link de recuperación: ${linkError?.message}`);

    await page.goto(linkData.properties.action_link);

    await expect(page).toHaveURL(/\/restablecer/, { timeout: 10_000 });
    await page.getByLabel("Nueva contraseña").fill(newPassword);
    await page.getByLabel("Confirma tu contraseña").fill(newPassword);
    await page.getByRole("button", { name: "Actualizar contraseña" }).click();

    // resetPassword() in app/(auth)/actions.ts redirects to /onboarding,
    // which — with no organization yet for this brand-new user — shows
    // the "create a company" wizard rather than erroring.
    await expect(page.getByRole("heading", { name: "Registra tu empresa" })).toBeVisible({ timeout: 10_000 });

    // The new password actually works, end to end, against a real session.
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/onboarding/);
  });
});
