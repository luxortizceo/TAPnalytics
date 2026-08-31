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
 * Busca en la base de soluciones pre-escritas (public.solution_playbook) una
 * entrada que coincida con alguna de las categorías del caso. Es la fuente
 * principal de sugerencias: no depende de ninguna API externa ni tiene
 * costo. Devuelve la primera coincidencia, respetando el orden en el que se
 * etiquetaron las categorías del caso.
 */
async function findPlaybookMatch(
  client: SupabaseClient<Database>,
  categoryCodes: string[]
): Promise<Omit<CaseAiSuggestion, "source"> | null> {
  if (categoryCodes.length === 0) return null;

  const { data } = await client
    .from("solution_playbook")
    .select("category_code, diagnosis, customer_response, internal_action")
    .in("category_code", categoryCodes);
  if (!data || data.length === 0) return null;

  const byCode = new Map(data.map((row) => [row.category_code, row]));
  const match = categoryCodes.map((code) => byCode.get(code)).find((row) => !!row);
  if (!match) return null;

  return {
    diagnosis: match.diagnosis,
    customerResponse: match.customer_response,
    internalAction: match.internal_action,
  };
}

/**
 * Genera (o regenera) la sugerencia de un caso: diagnóstico, mensaje para el
 * cliente y acción interna. Primero busca en la base de soluciones
 * pre-escritas (gratis, instantánea); solo si ninguna categoría del caso
 * tiene entrada ahí, intenta la IA como refuerzo (best-effort — si no está
 * configurada o falla, no toca la fila).
 */
export async function generateCaseAiSuggestion(
  client: SupabaseClient<Database>,
  caseId: string
): Promise<CaseAiSuggestion | null> {
  const { data: caseRow } = await client
    .from("cases")
    .select("id, summary, urgency, rating, feedback_session_id, contact_name")
    .eq("id", caseId)
    .single();
  if (!caseRow) return null;

  let comments: string[] = [];
  const categoryCodes: string[] = [];
  const categoryLabels: string[] = [];

  if (caseRow.feedback_session_id) {
    const { data: responses } = (await client
      .from("feedback_responses")
      .select("answer_text, response_categories(feedback_categories(code, label))")
      .eq("feedback_session_id", caseRow.feedback_session_id)) as unknown as {
      data:
        | {
            answer_text: string | null;
            response_categories: { feedback_categories: { code: string; label: string } | null }[];
          }[]
        | null;
    };

    comments = (responses ?? [])
      .map((r) => r.answer_text)
      .filter((t): t is string => !!t && t.trim().length > 0);

    const seen = new Set<string>();
    for (const r of responses ?? []) {
      for (const rc of r.response_categories ?? []) {
        const category = rc.feedback_categories;
        if (!category || seen.has(category.code)) continue;
        seen.add(category.code);
        categoryCodes.push(category.code);
        categoryLabels.push(category.label);
      }
    }
  }

  if (comments.length === 0 && caseRow.summary) comments = [caseRow.summary];

  const playbookMatch = await findPlaybookMatch(client, categoryCodes);
  const suggestion: CaseAiSuggestion | null = playbookMatch
    ? { ...playbookMatch, source: "playbook" }
    : await suggestCaseResolution({
        comments,
        categories: categoryLabels,
        urgency: caseRow.urgency,
        rating: caseRow.rating ?? "bad",
      }).then((ai) => (ai ? { ...ai, source: "ai" as const } : null));
  if (!suggestion) return null;

  const firstName = caseRow.contact_name?.trim().split(/\s+/)[0];
  const personalized: CaseAiSuggestion = firstName
    ? { ...suggestion, customerResponse: suggestion.customerResponse.replace(/^Hola,/, `Hola ${firstName},`) }
    : suggestion;

  const { error } = await client
    .from("cases")
    .update({ ai_suggestion: personalized, ai_suggestion_generated_at: new Date().toISOString() })
    .eq("id", caseId);
  if (error) {
    console.error("[cases] failed to save ai_suggestion", error);
    return null;
  }
  return personalized;
}
