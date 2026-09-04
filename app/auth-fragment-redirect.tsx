"use client";

import { useEffect } from "react";

/**
 * Supabase's dashboard-triggered emails (Send invitation / Send password
 * recovery from Authentication → Users) can't be given a custom redirectTo
 * — they always link to the project's Site URL, which here is the bare
 * site root (https://tapnalytics.vercel.app), not /auth/confirm. Supabase's
 * built-in email templates put the session in the URL *fragment*
 * (#access_token=...&type=invite|recovery|...), so it lands on whatever
 * page the root renders with the tokens just sitting unread in the hash —
 * nothing on that page ever looks at it.
 *
 * Mounted in the root layout (every route), this catches that fragment
 * wherever it lands and hands it to /auth/confirm's existing client-side
 * handler (see app/auth/confirm/confirm-client.tsx), which knows how to
 * read it, establish the session, and route the user onward (e.g. to
 * /restablecer to set a password). Guarded against /auth/confirm itself to
 * avoid a redirect loop there.
 */
export function AuthFragmentRedirect() {
  useEffect(() => {
    if (window.location.pathname === "/auth/confirm") return;
    if (window.location.hash.includes("access_token=")) {
      window.location.replace(`/auth/confirm${window.location.hash}`);
    }
  }, []);

  return null;
}
