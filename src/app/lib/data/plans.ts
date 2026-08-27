import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanRow } from "@/lib/supabase/types";

/**
 * Publicly readable, DB-driven plan catalog (see supabase/seed.sql — prices
 * are configured in the database or the superadmin panel, never hardcoded
 * here). Returns null when Supabase isn't configured yet or the request
 * fails, so callers can render an honest empty/error state instead of
 * fabricated pricing.
 */
export async function getActivePlans(): Promise<PlanRow[] | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
