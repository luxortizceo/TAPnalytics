import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseAiSuggestion, Database, ExperienceRating, UrgencyLevel } from "@/lib/supabase/types";
import { suggestCaseResolution } from "@/lib/ai";

// Default response-time SLA by urgency, used to set cases.due_at when a
// case is auto-created from a bad review. Configurable per-org SLAs are a
// later phase; these are sane, documented defaults.
const DUE_HOURS_BY_URGENCY: Record<UrgencyLevel, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 120,
};

export async function createCaseFromFeedback(
  admin: SupabaseClient<Database>,
  input: {
    organizationId: string;
    locationId: string;
    feedbackSessionId: string;
    rating: ExperienceRating;
    summary: string | null;
    urgency: UrgencyLevel;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  }
) {
  const dueAt = new Date(
    Date.now() + DUE_HOURS_BY_URGENCY[input.urgency] * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("cases")
    .insert({
      organization_id: input.organizationId,
      location_id: input.locationId,
      feedback_session_id: input.feedbackSessionId,
      rating: input.rating,
      summary: input.summary?.slice(0, 240) || null,
      urgency: input.urgency,
      status: "new",
      due_at: dueAt,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
    })
    .select("id, folio")
    .single();

  if (error) {
    console.error("[cases] failed to auto-create case from feedback", error);
    return null;
  }
  return data;
}

/**
 * Genera (o regenera) la sugerencia de IA de un caso: diagnóstico, mensaje
 * para el cliente y acción interna, a partir de su comentario y categorías.
 * Best-effort — si la IA no está configurada o falla, no toca la fila.
 */
export async function generateCaseAiSuggestion(
  client: SupabaseClient<Database>,
  caseId: string
): Promise<CaseAiSuggestion | null> {
  const { data: caseRow } = await client
    .from("cases")
    .select("id, summary, urgency, rating, feedback_session_id")
    .eq("id", caseId)
    .single();
  if (!caseRow) return null;

  let comments: string[] = [];
  let categories: string[] = [];

  if (caseRow.feedback_session_id) {
    const { data: responses } = (await client
      .from("feedback_responses")
      .select("answer_text, response_categories(feedback_categories(label))")
      .eq("feedback_session_id", caseRow.feedback_session_id)) as unknown as {
      data:
        | {
            answer_text: string | null;
            response_categories: { feedback_categories: { label: string } | null }[];
          }[]
        | null;
    };

    comments = (responses ?? [])
      .map((r) => r.answer_text)
      .filter((t): t is string => !!t && t.trim().length > 0);
    categories = Array.from(
      new Set(
        (responses ?? []).flatMap((r) =>
          (r.response_categories ?? [])
            .map((rc) => rc.feedback_categories?.label)
            .filter((v): v is string => !!v)
        )
      )
    );
  }

  if (comments.length === 0 && caseRow.summary) comments = [caseRow.summary];

  const suggestion = await suggestCaseResolution({
    comments,
    categories,
    urgency: caseRow.urgency,
    rating: caseRow.rating ?? "bad",
  });
  if (!suggestion) return null;

  const { error } = await client
    .from("cases")
    .update({ ai_suggestion: suggestion, ai_suggestion_generated_at: new Date().toISOString() })
    .eq("id", caseId);
  if (error) {
    console.error("[cases] failed to save ai_suggestion", error);
    return null;
  }
  return suggestion;
}
