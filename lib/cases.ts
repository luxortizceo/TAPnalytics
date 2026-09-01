import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseAiSuggestion, Database, ExperienceRating, UrgencyLevel } from "@/lib/supabase/types";
import { suggestCaseResolution } from "@/lib/ai";
import { URGENCY_LABELS } from "@/lib/labels";

// Default response-time SLA by urgency, used to set cases.due_at when a
// case is auto-created from a bad review. Configurable per-org SLAs are a
// later phase; these are sane, documented defaults.
const DUE_HOURS_BY_URGENCY: Record<UrgencyLevel, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 120,
};

// Detecta menciones de acoso o conducta inapropiada en el texto libre del
// cliente. Un cliente que vive esto puede no marcar la categoría correcta
// (o el catálogo puede no tenerla) — este detector es la red de seguridad:
// escala la urgencia del caso a "critical" sin importar lo que se haya
// seleccionado, y prioriza la entrada "harassment" del playbook por encima
// de cualquier otra categoría etiquetada. Deliberadamente no incluye
// palabras ambiguas como "tocó" (común en modismos sin relación, ej. "me
// tocó esperar") para evitar falsos positivos.
const SAFETY_CONCERN_PATTERNS = [
  /acos/i, // acoso, acosador, acosando, acosadoramente
  /manose/i, // manoseo, manosear
  /abus/i, // abuso, abusó, abusivo
  /amenaz/i, // amenaza, amenazó
  /agresi/i, // agresión, agresivo
  /agredi/i, // agredió
  /violenci/i, // violencia
  /discrimin/i, // discriminación, discriminó
  /se propas/i, // se propasó
  /insinuaci[oó]n/i, // insinuaciones (sexuales)
];

export function detectsSafetyConcern(text: string | null | undefined): boolean {
  if (!text) return false;
  return SAFETY_CONCERN_PATTERNS.some((pattern) => pattern.test(text));
}

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
  // Un reporte de acoso siempre es crítico, sin importar la urgencia que el
  // cliente haya seleccionado en el formulario (puede no haber sabido que
  // existía una opción más alta, o el formulario puede no reflejarlo bien).
  const urgency: UrgencyLevel = detectsSafetyConcern(input.summary) ? "critical" : input.urgency;

  const dueAt = new Date(Date.now() + DUE_HOURS_BY_URGENCY[urgency] * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("cases")
    .insert({
      organization_id: input.organizationId,
      location_id: input.locationId,
      feedback_session_id: input.feedbackSessionId,
      rating: input.rating,
      summary: input.summary?.slice(0, 240) || null,
      urgency,
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

const URGENCY_SEVERITY: Record<UrgencyLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const SIGNAL_STOPWORDS = new Set([
  "de", "la", "el", "en", "con", "por", "sin", "al", "del", "y", "a", "que", "no", "o", "se",
  "un", "una", "los", "las", "su", "sus", "es", "lo", "le", "ni", "u", "e", "para",
]);

// Raíz corta (4 caracteres) en vez de la palabra completa, porque el
// cliente casi nunca escribe la forma exacta del catálogo — ej.
// "acosadoramente" no contiene "acoso" completo, pero sí la raíz "acos"
// (mismo criterio que SAFETY_CONCERN_PATTERNS más arriba).
function stemWord(word: string): string {
  return word.length > 4 ? word.slice(0, 4) : word;
}

// Descompone un texto en el conjunto de raíces de sus palabras (≥4
// caracteres, sin stopwords). Se usa tanto para las "signals" del catálogo
// como para el comentario del cliente, y la coincidencia se hace
// raíz-contra-raíz por palabra completa — nunca como substring del texto
// crudo, porque eso cruza límites de palabra y genera falsos positivos
// (ej. "podemos" contiene "demo", "acosadoramente" contiene "amen").
function wordStems(text: string): Set<string> {
  const stems = new Set<string>();
  for (const word of text.toLowerCase().split(/[^\p{L}]+/u)) {
    if (word.length < 4 || SIGNAL_STOPWORDS.has(word)) continue;
    stems.add(stemWord(word));
  }
  return stems;
}

function signalStems(signals: string[]): Set<string> {
  const stems = new Set<string>();
  for (const signal of signals) for (const stem of wordStems(signal)) stems.add(stem);
  return stems;
}

/**
 * Busca en el catálogo de 185 escenarios de incidentes por giro de negocio
 * (public.incident_playbook) el que mejor coincida con el texto libre del
 * caso, comparando las "signals" de cada escenario contra los comentarios.
 * Es más específico que solution_playbook (categorías genéricas) y se
 * intenta primero: cubre desde "comida fría" hasta acoso o emergencias
 * médicas, con su propia guía de escalamiento y qué NO hacer.
 */
async function findIncidentMatch(
  client: SupabaseClient<Database>,
  comments: string[]
): Promise<Omit<CaseAiSuggestion, "source"> | null> {
  if (comments.length === 0) return null;
  const commentStems = wordStems(comments.join(" \n "));
  if (commentStems.size === 0) return null;

  const { data } = await client
    .from("incident_playbook")
    .select(
      "scenario_id, problem, category_label, vertical, urgency_default, signals, immediate_action, owner_role, customer_response, root_cause_action, escalation, do_not"
    )
    .order("scenario_id");
  if (!data || data.length === 0) return null;

  let best: (typeof data)[number] | null = null;
  let bestScore = 0;
  for (const row of data) {
    let score = 0;
    for (const stem of signalStems(row.signals)) if (commentStems.has(stem)) score++;
    if (score === 0) continue;
    const better =
      score > bestScore ||
      (score === bestScore && !!best && URGENCY_SEVERITY[row.urgency_default] > URGENCY_SEVERITY[best.urgency_default]);
    if (better) {
      best = row;
      bestScore = score;
    }
  }
  if (!best) return null;

  return {
    diagnosis: `${best.problem} — caso de "${best.category_label}" con urgencia ${URGENCY_LABELS[best.urgency_default]} según el catálogo de incidentes por giro de negocio (${best.vertical}).`,
    customerResponse: best.customer_response,
    internalAction: `Acción inmediata (responsable: ${best.owner_role}): ${best.immediate_action} Acción de fondo: ${best.root_cause_action}`,
    escalation: best.escalation ?? undefined,
    doNot: best.do_not.length > 0 ? best.do_not : undefined,
  };
}

/**
 * Genera (o regenera) la sugerencia de un caso: diagnóstico, mensaje para el
 * cliente y acción interna. Primero busca en el catálogo de incidentes por
 * giro de negocio (el más específico), luego en la base de soluciones
 * pre-escritas por categoría, y solo si ninguna de las dos tiene
 * coincidencia intenta la IA como refuerzo (best-effort — si no está
 * configurada o falla, no toca la fila). Todo antes de la IA es gratis e
 * instantáneo.
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

  // Prioriza la entrada de acoso del playbook por encima de cualquier
  // categoría etiquetada si el texto del cliente lo sugiere — ver
  // detectsSafetyConcern.
  if (comments.some((c) => detectsSafetyConcern(c)) && !categoryCodes.includes("harassment")) {
    categoryCodes.unshift("harassment");
  }

  const incidentMatch = await findIncidentMatch(client, comments);
  const playbookMatch = incidentMatch ? null : await findPlaybookMatch(client, categoryCodes);
  const suggestion: CaseAiSuggestion | null = incidentMatch
    ? { ...incidentMatch, source: "incident" }
    : playbookMatch
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
