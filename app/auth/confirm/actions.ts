"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Runs once a session has been established from an email link (either
 * server-side via verifyOtp with a token_hash, or client-side from a
 * hash-fragment link — see app/auth/confirm/confirm-client.tsx). Activates
 * any pending team invite for the now-authenticated user and reports where
 * to send them next.
 *
 * Accepting a team invite (inviteMember in app/app/equipo/actions.ts
 * inserts organization_members with status "invited") must activate the
 * pending membership — otherwise the person lands on /onboarding and
 * creates a brand-new organization of their own, since
 * getCurrentOrganization() only counts status "active" rows and never sees
 * the un-activated invite. Uses the admin client because the RLS update
 * policy only lets an org's owner/admin update membership rows, not the
 * invited user accepting their own.
 *
 * inviteUserByEmail() also creates the auth user with no password at all —
 * the invite link only authenticates them once. Send them through
 * /restablecer to set one before they can ever sign back in; it redirects
 * to /onboarding afterwards, which sees the just-activated membership and
 * sends them straight to their dashboard instead of the "create a
 * company" wizard.
 */
export async function resolvePostAuthRedirect(fallback: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login?error=confirm_link_invalid";

  const admin = createAdminClient();
  const { data: activatedRows } = await admin
    .from("organization_members")
    .update({ status: "active", joined_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "invited")
    .select("id");

  if (activatedRows && activatedRows.length > 0) return "/restablecer";
  return fallback;
}
