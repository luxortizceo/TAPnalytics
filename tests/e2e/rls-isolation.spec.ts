import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Automates the RLS isolation check from docs/architecture.md §3 against a
// real Supabase project: two unrelated users, each owning their own
// organization, and neither should be able to read or write the other's
// row through the anon-key + session client the app itself uses (i.e.
// exactly what a compromised or misbehaving browser client would attempt —
// this is what RLS, not application code, is supposed to stop). Doesn't
// use a browser at all — the policies don't care whether the request came
// from a page or a script.
//
// Requires a live Supabase project (same env vars as full-flow.spec.ts);
// skips itself otherwise. Creates and tears down its own users/orgs.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("RLS isolation between two organizations", () => {
  // playwright.config.ts sets fullyParallel: true, which runs each test in
  // its own worker — but beforeAll runs once per worker, not once overall.
  // Two workers racing this describe's beforeAll independently created two
  // "a" users/orgs with the same Date.now()-based slug and collided on the
  // unique constraint. Serial mode guarantees beforeAll runs exactly once.
  test.describe.configure({ mode: "serial" });

  test.skip(
    !SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY,
    "Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY"
  );

  let admin: SupabaseClient;
  const password = `Test${Date.now()}Aa!`;
  const users: { email: string; id: string; client: SupabaseClient; orgId: string }[] = [];

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    for (const label of ["a", "b"]) {
      const email = `e2e-rls-${label}-${Date.now()}@tapnalytics.test`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(`No se pudo crear el usuario ${label}: ${error?.message}`);

      // A fresh client per user, exactly like the browser client
      // (lib/supabase/client.ts) — anon key, session attached by
      // signInWithPassword, subject to RLS.
      const client = createClient(SUPABASE_URL!, ANON_KEY!);
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(`No se pudo iniciar sesión como ${label}: ${signInError.message}`);

      const { data: org, error: orgError } = await client
        .from("organizations")
        .insert({ name: `E2E RLS Org ${label} ${Date.now()}`, slug: `e2e-rls-${label}-${Date.now()}`, created_by: data.user.id })
        .select("id")
        .single();
      if (orgError || !org) throw new Error(`No se pudo crear la organización de ${label}: ${orgError?.message}`);

      users.push({ email, id: data.user.id, client, orgId: org.id });
    }
  });

  test.afterAll(async () => {
    if (!admin) return;
    for (const u of users) {
      await admin.from("organizations").delete().eq("id", u.orgId);
      await admin.auth.admin.deleteUser(u.id);
    }
  });

  test("a user can read and write their own organization", async () => {
    const [a] = users;
    const { data, error } = await a.client.from("organizations").select("id, name").eq("id", a.orgId).single();
    expect(error).toBeNull();
    expect(data?.id).toBe(a.orgId);

    const { error: updateError } = await a.client
      .from("organizations")
      .update({ name: "E2E RLS Org a (renamed)" })
      .eq("id", a.orgId);
    expect(updateError).toBeNull();
  });

  test("a user cannot read another organization's row", async () => {
    const [a, b] = users;
    const { data, error } = await b.client.from("organizations").select("id").eq("id", a.orgId).maybeSingle();
    // RLS makes the row invisible rather than returning a permission
    // error — a well-behaved policy denies by omission, not by 403.
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  test("a user cannot update another organization's row", async () => {
    const [a, b] = users;
    const { data, error } = await b.client
      .from("organizations")
      .update({ name: "hijacked" })
      .eq("id", a.orgId)
      .select("id");
    // The update policy's USING clause hides the row instead of erroring —
    // zero rows affected is the RLS-correct outcome here.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillOriginal } = await admin
      .from("organizations")
      .select("name")
      .eq("id", a.orgId)
      .single();
    expect(stillOriginal?.name).not.toBe("hijacked");
  });

  test("a user cannot list organization_members of another organization", async () => {
    const [a, b] = users;
    const { data, error } = await b.client
      .from("organization_members")
      .select("id")
      .eq("organization_id", a.orgId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
