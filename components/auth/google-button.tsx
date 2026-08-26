"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      className="w-full"
      onClick={handleClick}
      disabled={loading}
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.14-2.9 4.48-6.5 4.48A7.31 7.31 0 1 1 12.19 4.6a6.6 6.6 0 0 1 4.62 1.8l2.15-2.15A9.87 9.87 0 0 0 12.19 2 10 10 0 1 0 12.19 22c5.77 0 9.5-4.06 9.5-9.78 0-.66-.07-1.16-.34-1.12Z"
        />
      </svg>
      Continuar con Google
    </Button>
  );
}
