import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Handles Supabase email links: verification, magic link, password reset,
// and team invitations.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding";

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error && data.user) {
      // Accepting a team invite (inviteMember in app/app/equipo/actions.ts
      // inserts organization_members with status "invited") must activate
      // the pending membership and send the person to their dashboard —
      // otherwise they land on /onboarding and create a brand-new
      // organization of their own, since getCurrentOrganization() only
      // counts status "active" rows and never sees the un-activated invite.
      // Uses the admin client because the RLS update policy only lets an
      // org's owner/admin update membership rows, not the invited user
      // accepting their own.
      const admin = createAdminClient();
      const { data: activatedRows } = await admin
        .from("organization_members")
        .update({ status: "active", joined_at: new Date().toISOString() })
        .eq("user_id", data.user.id)
        .eq("status", "invited")
        .select("id");

      redirect(activatedRows && activatedRows.length > 0 ? "/app/dashboard" : next);
    }
  }

  redirect("/login?error=confirm_link_invalid");
}
