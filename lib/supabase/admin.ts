import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * ONLY use this from trusted server-side code that itself performs the
 * authorization check — the public NFC tap flow (/t/[code]), the survey
 * flow (/r/[code]), Stripe/Twilio webhooks, and scheduled jobs (reports,
 * alert evaluation). Never import this into anything that renders for, or
 * is reachable directly by, an end user's browser without an equivalent
 * server-side authorization check in front of it.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
