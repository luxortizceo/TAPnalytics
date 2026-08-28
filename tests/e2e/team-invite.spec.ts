import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Covers the two real bugs found while inviting a team member by hand in
// this project's actual Supabase instance:
//
// 1. Accepting an invite authenticated the person but never flipped their
//    organization_members row from "invited" to "active" — they'd land on
//    /onboarding and create a brand-new organization of their own instead
//    of joining the one that invited them (getCurrentOrganization() only
//    counts "active" rows).
// 2. inviteUserByEmail() creates the auth user with no password at all,
//    and this project's Supabase instance has no custom SMTP configured,
//    so Supabase's default (non-editable) email templates link back here
//    with the session in the URL *fragment* (#access_token=...) instead
//    of the ?token_hash=... query param the server-side confirm route
//    expects — see app/auth/confirm/confirm-client.tsx.
//
// Requires a live Supabase project (same env vars as full-flow.spec.ts);
// skips itself otherwise. Creates and tears down its own organization and
// users.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("Accepting a team invitation", () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY,
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );

  let admin: SupabaseClient;
  const ownerEmail = `e2e-invite-owner-${Date.now()}@tapnalytics.test`;
  const inviteeEmail = `e2e-invite-analyst-${Date.now()}@tapnalytics.test`;
  const newPassword = `Test${Date.now()}Aa!`;
  let ownerId = "";
  let inviteeId = "";
  let organizationId = "";

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    const { data: owner, error: ownerError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: `${newPassword}-owner`,
      email_confirm: true,
    });
    if (ownerError || !owner.user) throw new Error(`No se pudo crear el owner: ${ownerError?.message}`);
    ownerId = owner.user.id;

    // onboarding_step: "done" — a real business that's already finished
    // its own setup and is now inviting a teammate, not a brand-new one
    // still mid-wizard.
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: "E2E Invite Org",
        slug: `e2e-invite-org-${Date.now()}`,
        created_by: ownerId,
        onboarding_step: "done",
      })
      .select("id")
      .single();
    if (orgError || !org) throw new Error(`No se pudo crear la organización: ${orgError?.message}`);
    organizationId = org.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    if (organizationId) await admin.from("organizations").delete().eq("id", organizationId);
    if (ownerId) await admin.auth.admin.deleteUser(ownerId);
    if (inviteeId) await admin.auth.admin.deleteUser(inviteeId);
  });

  test("activates the pending membership, requires a new password, and lands on the org dashboard with the invited role", async ({
    page,
    baseURL,
  }) => {
    // generateLink(type: "invite") both creates the auth user and returns
    // the same kind of link inviteUserByEmail() would have emailed them —
    // this is the real production path, not a stand-in for it. redirectTo
    // matches exactly what app/app/equipo/actions.ts passes in production
    // (?next=/onboarding and all) — a mismatch here would let this test
    // pass while the real invite flow stays broken, exactly like the bug
    // this test exists to catch.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: inviteeEmail,
      options: { redirectTo: `${baseURL}/auth/confirm?next=/onboarding` },
    });
    if (linkError || !linkData) throw new Error(`No se pudo generar el link de invitación: ${linkError?.message}`);
    inviteeId = linkData.user.id;

    // Mirrors exactly what inviteMember() in app/app/equipo/actions.ts does.
    const { error: memberError } = await admin.from("organization_members").insert({
      organization_id: organizationId,
      user_id: inviteeId,
      role: "analyst",
      status: "invited",
      invited_by: ownerId,
      invited_at: new Date().toISOString(),
    });
    if (memberError) throw new Error(`No se pudo crear la membresía invitada: ${memberError.message}`);

    // Following this link is exactly what clicking the email link does —
    // Supabase's default template redirects here with the session in the
    // URL fragment, which only app/auth/confirm/confirm-client.tsx (a
    // client component) can read.
    await page.goto(linkData.properties.action_link);

    // Must require a password before anything else — inviteUserByEmail()
    // never sets one.
    await expect(page).toHaveURL(/\/restablecer/);
    await page.getByLabel("Nueva contraseña").fill(newPassword);
    await page.getByLabel("Confirma tu contraseña").fill(newPassword);
    await page.getByRole("button", { name: "Actualizar contraseña" }).click();

    // Lands on the dashboard of the org that invited them — not the
    // onboarding wizard for creating a brand-new company.
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Hola, E2E Invite Org" })).toBeVisible();
    await expect(page.getByRole("button", { name: "E2E Invite Org Analista" })).toBeVisible();

    // A view-only role shouldn't see the team/billing management sections.
    await expect(page.getByRole("link", { name: "Equipo" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Facturación" })).not.toBeVisible();

    const { data: membership } = await admin
      .from("organization_members")
      .select("status")
      .eq("organization_id", organizationId)
      .eq("user_id", inviteeId)
      .single();
    expect(membership?.status).toBe("active");
  });
});
