import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The only test in this suite that touches a real Supabase project — see
// tests/e2e/auth-pages.spec.ts and demo-form.spec.ts for why the rest of
// this suite deliberately avoids the database. This one exercises the full
// authenticated read/write path for real: registro (via the Admin API, to
// skip email confirmation) → login → onboarding wizard (empresa, sucursal,
// marca, landing, tarjeta NFC) → tap NFC público como cliente anónimo →
// encuesta con calificación "mala" → caso creado → visible en /app/casos y
// en el dashboard.
//
// Requires a live Supabase project wired up via .env.local (same
// requirement as `npm run dev`) — skips itself otherwise so `npm run
// test:e2e` still passes without one configured. Creates and tears down its
// own organization/user each run; safe to run repeatedly against a shared
// project.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("Full flow against a live Supabase project", () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY,
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );

  let admin: SupabaseClient;
  const testEmail = `e2e-${Date.now()}@tapnalytics.test`;
  const testPassword = `Test${Date.now()}Aa!`;
  let userId = "";
  let organizationId = "";

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);
    const { data, error } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "E2E Test" },
    });
    if (error || !data.user) throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
    userId = data.user.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    // Cascades to locations, nfc_cards, tap_events, feedback_sessions,
    // feedback_responses, cases, alerts, organization_members, etc. — every
    // organization_id FK in 0002_core_tables.sql is ON DELETE CASCADE.
    if (organizationId) await admin.from("organizations").delete().eq("id", organizationId);
    // Cascades to profiles (profiles.id references auth.users(id) ON DELETE CASCADE).
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test("registro→empresa→sucursal→landing→tarjeta→tap→encuesta→caso", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(testEmail);
    await page.getByLabel("Contraseña", { exact: true }).fill(testPassword);
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    // Paso 1: Empresa
    await expect(page.getByRole("heading", { name: "Registra tu empresa" })).toBeVisible();
    await page.getByLabel("Nombre de la empresa").fill("E2E Test Org");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 2: Sucursal — la empresa ya existe en este punto, captúrala para
    // el cleanup y para poder verificar el caso directamente en la BD luego.
    await expect(page.getByRole("heading", { name: "Crea tu primera sucursal" })).toBeVisible();
    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .eq("created_by", userId)
      .single();
    expect(org?.id).toBeTruthy();
    organizationId = org!.id as string;

    await page.getByLabel("Nombre de la sucursal").fill("Sucursal E2E");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 3: Marca — opcional, se deja vacío.
    await expect(page.getByRole("heading", { name: "Logotipo y reseñas de Google" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 4: Landing — los valores por defecto ya son válidos.
    await expect(page.getByRole("heading", { name: "Configura tu landing de encuesta" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 5: Tarjeta NFC
    await expect(page.getByRole("heading", { name: "Crea tu primera tarjeta NFC" })).toBeVisible();
    await page.getByRole("button", { name: "Crear tarjeta" }).click();

    // Paso 6: capturar la URL pública real de la tarjeta y terminar el
    // onboarding (requerido: /app/* redirige de vuelta si onboarding_step
    // no quedó en "done" — ver app/app/layout.tsx).
    await expect(page.getByRole("heading", { name: "Prueba tu enlace" })).toBeVisible();
    const tapUrl = await page
      .getByRole("link", { name: "Abrir la encuesta como la vería un cliente" })
      .getAttribute("href");
    expect(tapUrl).toBeTruthy();
    await page.getByRole("button", { name: "Ir a mi panel" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // Simula un cliente anónimo (sin cookies de sesión del negocio)
    // tapeando la tarjeta y calificando "mala" con un comentario único.
    const answerMarker = `e2e-marker-${Date.now()}`;
    const anonContext = await page.context().browser()!.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(tapUrl!);
    await expect(anonPage).toHaveURL(/\/r\//);
    await anonPage.getByRole("button", { name: "Mala" }).click();
    await anonPage.getByLabel("¿Qué ocurrió?").fill(answerMarker);
    await anonPage.getByRole("button", { name: "Enviar" }).click();
    await expect(anonPage.getByRole("heading", { name: "¡Listo!" })).toBeVisible();
    await anonContext.close();

    // Verifica en la base de datos (bypaseando RLS con el service role,
    // igual que hace la propia app en app/r/[code]/actions.ts) que el caso
    // se creó de verdad con el comentario correcto — no solo que la UI
    // pública mostró un mensaje de éxito.
    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from("cases")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("summary", answerMarker)
            .maybeSingle();
          return data?.id ?? null;
        },
        { timeout: 10_000, message: "El caso nunca apareció en la base de datos" }
      )
      .not.toBeNull();

    // Y que la propia app, leyendo con el rol authenticated (no el service
    // role), también lo ve — esto es lo que de verdad se rompía cuando
    // faltaban los GRANT de tabla (ver el fix aplicado en esta sesión).
    await page.goto("/app/casos");
    await expect(page.getByText("No hay casos con estos filtros.")).not.toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    await page.goto("/app/dashboard");
    await expect(page.getByText("Casos sin resolver")).toBeVisible();
  });
});
