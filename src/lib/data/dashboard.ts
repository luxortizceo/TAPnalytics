import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CategoryKind, ExperienceRating } from "@/lib/supabase/types";

export interface DashboardFilters {
  organizationId: string;
  locationId?: string;
  startDate: Date;
  endDate: Date;
}

export interface DashboardData {
  totalTaps: number;
  uniqueTaps: number;
  surveysStarted: number;
  surveysCompleted: number;
  conversionRate: number;
  ratingCounts: Record<ExperienceRating, number>;
  satisfactionIndex: number | null;
  satisfactionTrendPct: number | null;
  topCategories: { kind: CategoryKind; label: string; count: number }[];
  locationPerformance: { locationId: string; name: string; satisfactionIndex: number | null; responses: number }[];
  topCards: { cardId: string; alias: string; taps: number }[];
  hourlyBadCounts: { hour: number; count: number }[];
  recentComments: { rating: ExperienceRating | null; text: string; locationName: string; createdAt: string }[];
  activeAlerts: number;
  openCases: number;
}

function satisfactionScore(counts: Record<ExperienceRating, number>): number | null {
  const total = counts.bad + counts.good + counts.excellent;
  if (total === 0) return null;
  return Math.round(((counts.excellent * 1 + counts.good * 0.5) / total) * 100);
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const supabase = await createClient();
  const { organizationId, locationId, startDate, endDate } = filters;
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  let tapQuery = supabase
    .from("tap_events")
    .select("id, card_id, location_id, ip_hash, occurred_at, rating")
    .eq("organization_id", organizationId)
    .gte("occurred_at", startIso)
    .lt("occurred_at", endIso);
  if (locationId) tapQuery = tapQuery.eq("location_id", locationId);
  const { data: taps } = await tapQuery;

  let sessionQuery = supabase
    .from("feedback_sessions")
    .select("id, status, rating, location_id")
    .eq("organization_id", organizationId)
    .gte("started_at", startIso)
    .lt("started_at", endIso);
  if (locationId) sessionQuery = sessionQuery.eq("location_id", locationId);
  const { data: sessions } = await sessionQuery;

  const totalTaps = taps?.length ?? 0;
  const uniqueTaps = new Set((taps ?? []).map((t) => t.ip_hash).filter(Boolean)).size;
  const surveysStarted = sessions?.length ?? 0;
  const surveysCompleted = (sessions ?? []).filter((s) => s.status === "completed").length;
  const conversionRate = surveysStarted > 0 ? Math.round((surveysCompleted / surveysStarted) * 100) : 0;

  const ratingCounts: Record<ExperienceRating, number> = { bad: 0, good: 0, excellent: 0 };
  for (const s of sessions ?? []) {
    if (s.rating) ratingCounts[s.rating]++;
  }
  const satisfactionIndex = satisfactionScore(ratingCounts);

  // Previous period of equal length, for the trend comparison.
  const periodMs = endDate.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - periodMs);
  const prevEnd = new Date(startDate.getTime());
  let prevQuery = supabase
    .from("feedback_sessions")
    .select("rating")
    .eq("organization_id", organizationId)
    .gte("started_at", prevStart.toISOString())
    .lt("started_at", prevEnd.toISOString());
  if (locationId) prevQuery = prevQuery.eq("location_id", locationId);
  const { data: prevSessions } = await prevQuery;
  const prevCounts: Record<ExperienceRating, number> = { bad: 0, good: 0, excellent: 0 };
  for (const s of prevSessions ?? []) {
    if (s.rating) prevCounts[s.rating]++;
  }
  const prevIndex = satisfactionScore(prevCounts);
  const satisfactionTrendPct =
    satisfactionIndex !== null && prevIndex !== null && prevIndex > 0
      ? Math.round(((satisfactionIndex - prevIndex) / prevIndex) * 100)
      : null;

  // Top problems/strengths: categories attached to responses within range.
  const sessionIds = (sessions ?? []).map((s) => s.id);
  let topCategories: DashboardData["topCategories"] = [];
  const recentComments: DashboardData["recentComments"] = [];
  if (sessionIds.length > 0) {
    const { data: responses } = (await supabase
      .from("feedback_responses")
      .select("answer_text, created_at, feedback_session_id, response_categories(feedback_categories(label, kind))")
      .in("feedback_session_id", sessionIds)
      .order("created_at", { ascending: false })) as unknown as {
      data:
        | {
            answer_text: string | null;
            created_at: string;
            feedback_session_id: string;
            response_categories: { feedback_categories: { label: string; kind: CategoryKind } | null }[];
          }[]
        | null;
    };

    const categoryCounts = new Map<string, { kind: CategoryKind; label: string; count: number }>();
    const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));
    const { data: locationsForNames } = await supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", organizationId);
    const locNameById = new Map((locationsForNames ?? []).map((l) => [l.id, l.name]));

    for (const r of responses ?? []) {
      for (const rc of r.response_categories ?? []) {
        if (!rc.feedback_categories) continue;
        const key = `${rc.feedback_categories.kind}:${rc.feedback_categories.label}`;
        const existing = categoryCounts.get(key);
        if (existing) existing.count++;
        else categoryCounts.set(key, { kind: rc.feedback_categories.kind, label: rc.feedback_categories.label, count: 1 });
      }
      if (r.answer_text && recentComments.length < 8) {
        const session = sessionById.get(r.feedback_session_id);
        recentComments.push({
          rating: session?.rating ?? null,
          text: r.answer_text,
          locationName: session ? locNameById.get(session.location_id) ?? "" : "",
          createdAt: r.created_at,
        });
      }
    }
    topCategories = [...categoryCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }

  // Per-location comparison.
  const { data: allLocations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId);
  const locationPerformance = (allLocations ?? []).map((loc) => {
    const locSessions = (sessions ?? []).filter((s) => s.location_id === loc.id);
    const counts: Record<ExperienceRating, number> = { bad: 0, good: 0, excellent: 0 };
    for (const s of locSessions) if (s.rating) counts[s.rating]++;
    return {
      locationId: loc.id,
      name: loc.name,
      satisfactionIndex: satisfactionScore(counts),
      responses: locSessions.filter((s) => s.rating).length,
    };
  });

  // Top active cards.
  const cardTapCounts = new Map<string, number>();
  for (const t of taps ?? []) cardTapCounts.set(t.card_id, (cardTapCounts.get(t.card_id) ?? 0) + 1);
  const topCardIds = [...cardTapCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  let topCards: DashboardData["topCards"] = [];
  if (topCardIds.length > 0) {
    const { data: cardRows } = await supabase
      .from("nfc_cards")
      .select("id, alias")
      .in("id", topCardIds.map(([id]) => id));
    const aliasById = new Map((cardRows ?? []).map((c) => [c.id, c.alias]));
    topCards = topCardIds.map(([cardId, taps]) => ({
      cardId,
      alias: aliasById.get(cardId) || "Sin alias",
      taps,
    }));
  }

  // Hours with the most "bad" taps.
  const hourlyMap = new Map<number, number>();
  for (const t of taps ?? []) {
    if (t.rating !== "bad") continue;
    const hour = new Date(t.occurred_at).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);
  }
  const hourlyBadCounts = [...hourlyMap.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const [{ count: activeAlerts }, { count: openCases }] = await Promise.all([
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .not("status", "in", "(resolved,closed)"),
  ]);

  return {
    totalTaps,
    uniqueTaps,
    surveysStarted,
    surveysCompleted,
    conversionRate,
    ratingCounts,
    satisfactionIndex,
    satisfactionTrendPct,
    topCategories,
    locationPerformance,
    topCards,
    hourlyBadCounts,
    recentComments,
    activeAlerts: activeAlerts ?? 0,
    openCases: openCases ?? 0,
  };
}
