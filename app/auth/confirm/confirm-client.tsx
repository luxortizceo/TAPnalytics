"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolvePostAuthRedirect } from "./actions";

export function ConfirmClient({ fallback }: { fallback: string }) {
  const router = useRouter();
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let settled = false;

    async function run() {
      // Parse and set the session explicitly instead of relying on
      // detectSessionInUrl's automatic handling — if this browser already
      // has an active session (e.g. the invite is opened in a tab that was
      // signed in as someone else), auto-detection does not reliably
      // replace it, and requests keep authenticating as the old user.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const type = hash.get("type");

      if (!access_token || !refresh_token) {
        setInvalid(true);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (settled) return;
      settled = true;

      if (error) {
        setInvalid(true);
        return;
      }

      // Drop the tokens from the URL now that the session is established —
      // they're single-use, but no reason to leave them sitting in history.
      window.history.replaceState(null, "", window.location.pathname);
      const dest = await resolvePostAuthRedirect(fallback, type === "invite");
      router.replace(dest);
    }

    run();
    return () => {
      settled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (invalid) router.replace("/login?error=confirm_link_invalid");
  }, [invalid, router]);

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Verificando tu acceso…</p>
    </div>
  );
}
