"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ExperienceRating } from "@/lib/supabase/types";

export type ResolutionFeedbackState = { error?: string; success?: boolean };

const VALID_RATINGS: ExperienceRating[] = ["bad", "good", "excellent"];

/**
 * Public, unauthenticated write — reached only through a one-time random
 * token mailed to the customer (see app/app/casos/actions.ts), same trust
 * model as the /t and /r survey flows. Guarded so the rating can only ever
 * be set once per case: a link opened twice (or prefetched by an email
 * scanner before the customer clicks a specific button) can't overwrite an
 * answer that's already there.
 */
export async function submitResolutionFeedback(
  token: string,
  rating: string,
  comment: string
): Promise<ResolutionFeedbackState> {
  if (!VALID_RATINGS.includes(rating as ExperienceRating)) {
    return { error: "Calificación inválida." };
  }

  const admin = createAdminClient();
  const { data: caseRow } = await admin
    .from("cases")
    .select("id, resolution_rating")
    .eq("resolution_feedback_token", token)
    .maybeSingle();

  if (!caseRow) return { error: "Este enlace ya no es válido." };
  if (caseRow.resolution_rating !== null) return { success: true };

  const { error } = await admin
    .from("cases")
    .update({
      resolution_rating: rating as ExperienceRating,
      resolution_rating_at: new Date().toISOString(),
      resolution_comment: comment.trim() || null,
    })
    .eq("id", caseRow.id)
    .is("resolution_rating", null);

  if (error) return { error: "No pudimos guardar tu respuesta. Intenta de nuevo." };
  return { success: true };
}
