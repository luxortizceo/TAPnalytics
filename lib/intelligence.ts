import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CaseStatus,
  CategoryKind,
  Database,
  ExperienceRating,
  InsightType,
  UrgencyLevel,
} from "@/lib/supabase/types";
import { analyzeSentiment } from "@/lib/ai";
import { URGENCY_LABELS } from "@/lib/labels";

/**
 * TAP Intelligence — mostly a rule-based analysis engine, not an external AI
 * call. It compares the current period against the equal-length previous
 * period to flag category spikes, satisfaction trends, and location gaps,
 * then writes them as `ai_insights` with the evidence that produced them
 * plus a linked `recommendations` row when the insight needs action.
 * `confidence` is a transparent heuristic based on sample size, not a
 * statistical model — same honesty rule as the dashboard's satisfaction
 * index.
 *
 * The one part that genuinely calls an LLM is the sentiment pass at the end
 * (see `sentimentInsight` below) — it reads free-text comments through
 * lib/ai.ts, which degrades to a no-op when AI_API_KEY isn't configured, so
 * everything else here keeps working without it.
 *
 * Runs on demand (a staff member clicks "Analizar ahora") since the project
 * has no queue/cron infrastructure yet; see lib/cases.ts for the same
 * synchronous-by-design choice.
 */

const MIN_SAMPLE = 3;
const SPIKE_RATIO = 1.5;

export function confidenceFor(sampleSize: number) {
  return Math.min(0.95, Math.round((0.35 + Math.min(sampleSize, 20) * 0.03) * 1000) / 1000);
}

export function satisfactionScore(counts: Record<ExperienceRating, number>): number | null {
  const total = counts.bad + counts.good + counts.excellent;
  if (total === 0) return null;
  return Math.round(((counts.excellent * 1 + counts.good * 0.5) / total) * 100);
}

type CategoryStat = { kind: CategoryKind; label: string; count: number };

async function categoryCounts(
  admin: SupabaseClient<Database>,
  organizationId: string,
  startIso: string,
  endIso: string
): Promise<Map<string, CategoryStat>> {
  const { data: sessions } = await admin
    .from("feedback_sessions")
    .select("id")
    .eq("organization_id", organizationId)
    .gte("started_at", startIso)
    .lt("started_at", endIso);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const counts = new Map<string, CategoryStat>();
  if (sessionIds.length === 0) return counts;

  const { data: responses } = (await admin
    .from("feedback_responses")
    .select("feedback_session_id, response_categories(feedback_categories(label, kind))")
    .in("feedback_session_id", sessionIds)) as unknown as {
    data:
      | {
          feedback_session_id: string;
          response_categories: { feedback_categories: { label: string; kind: CategoryKind } | null }[];
        }[]
      | null;
  };

  for (const r of responses ?? []) {
    for (const rc of r.response_categories ?? []) {
      if (!rc.feedback_categories) continue;
      const key = `${rc.feedback_categories.kind}:${rc.feedback_categories.label}`;
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { kind: rc.feedback_categories.kind, label: rc.feedback_categories.label, count: 1 });
    }
  }
  return counts;
}

async function ratingCounts(
  admin: SupabaseClient<Database>,
  organizationId: string,
  startIso: string,
  endIso: string
): Promise<Record<ExperienceRating, number>> {
  const { data } = await admin
    .from("feedback_sessions")
    .select("rating")
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .gte("started_at", startIso)
    .lt("started_at", endIso);
  const counts: Record<ExperienceRating, number> = { bad: 0, good: 0, excellent: 0 };
  for (const s of data ?? []) if (s.rating) counts[s.rating]++;
  return counts;
}

async function insightAlreadyExists(
  admin: SupabaseClient<Database>,
  organizationId: string,
  type: InsightType,
  title: string,
  periodStart: string,
  periodEnd: string
) {
  const { data } = await admin
    .from("ai_insights")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("type", type)
    .eq("title", title)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();
  return !!data;
}

export async function generateInsights(admin: SupabaseClient<Database>, organizationId: string) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevStart = new Date(periodStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodStartDate = periodStart.toISOString().slice(0, 10);
  const periodEndDate = now.toISOString().slice(0, 10);

  const [currentCats, prevCats, currentRatings, prevRatings] = await Promise.all([
    categoryCounts(admin, organizationId, periodStart.toISOString(), now.toISOString()),
    categoryCounts(admin, organizationId, prevStart.toISOString(), periodStart.toISOString()),
    ratingCounts(admin, organizationId, periodStart.toISOString(), now.toISOString()),
    ratingCounts(admin, organizationId, prevStart.toISOString(), periodStart.toISOString()),
  ]);

  const created: { id: string; title: string }[] = [];

  async function insertInsight(input: {
    type: InsightType;
    title: string;
    description: string;
    evidence: Record<string, unknown>;
    sampleSize: number;
    recommendation?: { description: string; suggestedAction: string };
    locationId?: string | null;
  }) {
    if (await insightAlreadyExists(admin, organizationId, input.type, input.title, periodStartDate, periodEndDate)) {
      return;
    }
    const { data: insight, error } = await admin
      .from("ai_insights")
      .insert({
        organization_id: organizationId,
        location_id: input.locationId ?? null,
        type: input.type,
        title: input.title,
        description: input.description,
        evidence: input.evidence,
        period_start: periodStartDate,
        period_end: periodEndDate,
        sample_size: input.sampleSize,
        confidence: confidenceFor(input.sampleSize),
      })
      .select("id")
      .single();
    if (error || !insight) {
      console.error("[intelligence] failed to create insight", error);
      return;
    }
    created.push({ id: insight.id, title: input.title });

    if (input.recommendation) {
      await admin.from("recommendations").insert({
        organization_id: organizationId,
        ai_insight_id: insight.id,
        title: input.title,
        description: input.recommendation.description,
        suggested_action: input.recommendation.suggestedAction,
        status: "open",
      });
    }
  }

  // 1. Category spikes / recurring issues (negative categories only).
  for (const [key, stat] of currentCats) {
    if (stat.kind !== "negative" || stat.count < MIN_SAMPLE) continue;
    const prevCount = prevCats.get(key)?.count ?? 0;
    const isSpike = prevCount === 0 ? stat.count >= MIN_SAMPLE : stat.count >= prevCount * SPIKE_RATIO;
    if (!isSpike) continue;
    const isRecurring = prevCount >= MIN_SAMPLE;
    await insertInsight({
      type: isRecurring ? "recurring_issue" : "anomaly",
      title: isRecurring
        ? `Problema recurrente: "${stat.label}"`
        : `Aumento repentino: "${stat.label}"`,
      description: `"${stat.label}" se mencionó ${stat.count} veces en los últimos 30 días, frente a ${prevCount} en los 30 días anteriores.`,
      evidence: { category: stat.label, current_count: stat.count, previous_count: prevCount },
      sampleSize: stat.count,
      recommendation: {
        description: `Revisar con el equipo los casos relacionados con "${stat.label}" de las últimas semanas para identificar la causa raíz.`,
        suggestedAction: `Auditar los casos etiquetados "${stat.label}" y definir una acción correctiva.`,
      },
    });
  }

  // 2. Satisfaction trend.
  const currentIndex = satisfactionScore(currentRatings);
  const prevIndex = satisfactionScore(prevRatings);
  if (currentIndex !== null && prevIndex !== null) {
    const delta = currentIndex - prevIndex;
    if (Math.abs(delta) >= 10) {
      const sample = currentRatings.bad + currentRatings.good + currentRatings.excellent;
      await insertInsight({
        type: "trend",
        title: delta < 0 ? "Caída en el índice de satisfacción" : "Mejora en el índice de satisfacción",
        description: `El índice de satisfacción pasó de ${prevIndex}% a ${currentIndex}% (${delta > 0 ? "+" : ""}${delta} puntos) en los últimos 30 días.`,
        evidence: { current_index: currentIndex, previous_index: prevIndex, delta },
        sampleSize: sample,
        recommendation:
          delta < 0
            ? {
                description: "El índice de satisfacción bajó de forma notoria respecto al periodo anterior.",
                suggestedAction: "Revisar el detalle del dashboard por sucursal y horario para localizar el origen de la caída.",
              }
            : undefined,
      });
    }
  }

  // 3. Location comparison — flag the weakest location vs the org average.
  const { data: locations } = await admin
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  if (locations && locations.length > 1 && currentIndex !== null) {
    const { data: sessions } = await admin
      .from("feedback_sessions")
      .select("location_id, rating")
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .gte("started_at", periodStart.toISOString())
      .lt("started_at", now.toISOString());

    const perLocation = locations.map((loc) => {
      const counts: Record<ExperienceRating, number> = { bad: 0, good: 0, excellent: 0 };
      for (const s of sessions ?? []) if (s.location_id === loc.id && s.rating) counts[s.rating]++;
      const total = counts.bad + counts.good + counts.excellent;
      return { location: loc, index: satisfactionScore(counts), total };
    });
    const withEnoughData = perLocation.filter((l) => l.total >= MIN_SAMPLE && l.index !== null);
    if (withEnoughData.length > 1) {
      const worst = withEnoughData.reduce((a, b) => (b.index! < a.index! ? b : a));
      if (currentIndex - worst.index! >= 15) {
        await insertInsight({
          type: "comparison",
          title: `Sucursal por debajo del promedio: ${worst.location.name}`,
          description: `"${worst.location.name}" tiene un índice de satisfacción de ${worst.index}%, frente al ${currentIndex}% del promedio de la organización.`,
          evidence: { location: worst.location.name, location_index: worst.index, org_index: currentIndex },
          sampleSize: worst.total,
          locationId: worst.location.id,
          recommendation: {
            description: `"${worst.location.name}" está rindiendo notablemente por debajo del resto de las sucursales.`,
            suggestedAction: `Programar una visita o revisión operativa en ${worst.location.name}.`,
          },
        });
      }
    }
  }

  // 4. Sentiment over free-text comments (real LLM call, best-effort).
  await sentimentInsight(admin, organizationId, periodStart.toISOString(), now.toISOString(), insertInsight);

  // 5. Casos críticos/urgentes sin resolver — no depende del periodo de 30
  // días: un caso crítico sigue siendo crítico sin importar cuándo se creó,
  // mientras siga abierto. Se corre al final para que, en un mismo run,
  // quede como el hallazgo más reciente (aunque la página igual lo ordena
  // primero explícitamente — ver app/app/inteligencia/page.tsx).
  await criticalCasesInsight(admin, organizationId, insertInsight);

  return created;
}

const SENTIMENT_SAMPLE_CAP = 40;
const NEGATIVE_SENTIMENT_THRESHOLD = 0.3; // 30% of analyzed comments read as negative

async function sentimentInsight(
  admin: SupabaseClient<Database>,
  organizationId: string,
  startIso: string,
  endIso: string,
  insertInsight: (input: {
    type: InsightType;
    title: string;
    description: string;
    evidence: Record<string, unknown>;
    sampleSize: number;
    recommendation?: { description: string; suggestedAction: string };
  }) => Promise<void>
) {
  const { data: sessions } = await admin
    .from("feedback_sessions")
    .select("id")
    .eq("organization_id", organizationId)
    .gte("started_at", startIso)
    .lt("started_at", endIso);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) return;

  const { data: responses } = await admin
    .from("feedback_responses")
    .select("answer_text")
    .in("feedback_session_id", sessionIds)
    .not("answer_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(SENTIMENT_SAMPLE_CAP);

  const texts = (responses ?? [])
    .map((r) => r.answer_text)
    .filter((t): t is string => !!t && t.trim().length > 0);
  if (texts.length < MIN_SAMPLE) return;

  const results = await analyzeSentiment(texts);
  if (!results || results.length === 0) return;

  const negative = results.filter((r) => r.sentiment === "negative");
  const ratio = negative.length / results.length;
  if (ratio < NEGATIVE_SENTIMENT_THRESHOLD) return;

  const examples = negative.slice(0, 3).map((r) => r.summary);
  await insertInsight({
    type: "summary",
    title: "Sentimiento negativo detectado en comentarios",
    description: `De ${results.length} comentarios analizados por IA en los últimos 30 días, ${negative.length} (${Math.round(ratio * 100)}%) tienen un tono negativo — más allá de lo que capturan las categorías etiquetadas.`,
    evidence: {
      analyzed: results.length,
      negative: negative.length,
      ratio: Math.round(ratio * 100) / 100,
      examples,
      source: "claude-sentiment-analysis",
    },
    sampleSize: results.length,
    recommendation: {
      description:
        "Varios comentarios recientes tienen un tono negativo que vale la pena revisar en su propio texto, no solo por su calificación numérica.",
      suggestedAction: "Leer los comentarios completos en Casos/Reportes y confirmar si reflejan un problema puntual o algo más amplio.",
    },
  });
}

const OPEN_CASE_STATUSES = ["new", "reviewing", "in_progress", "waiting_response"] satisfies CaseStatus[];

/**
 * Un hallazgo por cada caso crítico o de alta urgencia que siga abierto —
 * no depende del periodo de 30 días ni de ningún umbral de muestra: basta
 * un caso así para que valga la pena mostrarlo. La página de TAP
 * Intelligence lo ordena siempre primero (ver app/app/inteligencia/page.tsx).
 */
async function criticalCasesInsight(
  admin: SupabaseClient<Database>,
  organizationId: string,
  insertInsight: (input: {
    type: InsightType;
    title: string;
    description: string;
    evidence: Record<string, unknown>;
    sampleSize: number;
    recommendation?: { description: string; suggestedAction: string };
    locationId?: string | null;
  }) => Promise<void>
) {
  const { data: openCases } = await admin
    .from("cases")
    .select("id, folio, urgency, summary, location_id")
    .eq("organization_id", organizationId)
    .in("urgency", ["critical", "high"] satisfies UrgencyLevel[])
    .in("status", OPEN_CASE_STATUSES)
    .order("created_at", { ascending: false });

  for (const c of openCases ?? []) {
    await insertInsight({
      type: "critical_case",
      title: `Caso ${c.urgency === "critical" ? "crítico" : "urgente"} sin resolver: ${c.folio}`,
      description: c.summary
        ? `"${c.summary}" — este caso tiene prioridad ${URGENCY_LABELS[c.urgency]} y sigue abierto. Abre el caso para ver la sugerencia de TAP Intelligence con los pasos a seguir, incluyendo cómo desescalar si la situación lo amerita.`
        : `El caso ${c.folio} tiene prioridad ${URGENCY_LABELS[c.urgency]} y sigue abierto — requiere atención inmediata.`,
      evidence: { case_id: c.id, folio: c.folio, urgency: c.urgency },
      sampleSize: 1,
      locationId: c.location_id,
      recommendation: {
        description: `Este caso no se ha resuelto y su prioridad es "${URGENCY_LABELS[c.urgency]}".`,
        suggestedAction: `Abrir el caso ${c.folio}, revisar su sugerencia de TAP Intelligence y actuar de inmediato.`,
      },
    });
  }
}
