import { redirect } from "next/navigation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolvePostAuthRedirect } from "./actions";
import { ConfirmClient } from "./confirm-client";

// Handles Supabase email links: verification, magic link, password reset,
// and team invitations.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;
  const fallback = next && next.startsWith("/") ? next : "/onboarding";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash });
    if (!error) {
      redirect(await resolvePostAuthRedirect(fallback));
    }
    redirect("/login?error=confirm_link_invalid");
  }

  // No token_hash in the query string. This project uses Supabase's
  // built-in (non-custom-SMTP) email service, whose default templates
  // can't be edited and link here with {{ .ConfirmationURL }} — which
  // puts the session tokens in the URL *fragment* instead (e.g.
  // #access_token=...&type=invite). A fragment is never sent to the
  // server, so hand off to a client component that reads it directly,
  // establishes the session, and completes the same redirect logic.
  return <ConfirmClient fallback={fallback} />;
}
