import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CategoryKind, Database, ExperienceRating } from "@/lib/supabase/types";

/**
 * Multi-week trend data for the dashboard's "evolución" charts. Unlike
 * getDashboardData (lib/data/dashboard.ts), which answers "how are we doing
 * in the selected period," this always looks at a fixed 12-week window —
 * trend lines need several points to mean anything, so they intentionally
 * ignore the period filter.
 */

const TREND_WEEKS = 12;
const TOP_CATEGORY_COUNT = 5;

function satisfactionScore(counts: Record<ExperienceRating, number>): number | null {
  const total = counts.bad + counts.good + counts.excellent;
  if (total === 0) return null;
  return Math.round(((counts.excellent * 1 + counts.good * 0.5) / total) * 100);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function weekLabel(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export interface TrendData {
  satisfactionTrend: { week: string; index: number | null }[];
  locationTrend: Array<Record<string, string | number | null>>;
  locationNames: string[];
  categoryTrend: Array<Record<string, string | number>>;
  topCategoryLabels: string[];
  googleTrend: { date: string; rating: number | null; reviewCount: number | null; locationName: string }[];
  hasGoogleData: boolean;
}

export async function getTrendData(
  organizationId: string,
  client?: SupabaseClient<Database>
): Promise<TrendData> {
  const supabase = client ?? (await createClient());
  const now = new Date();
  const windowStart = new Date(
    startOfWeek(now).getTime() - (TREND_WEEKS - 1) * 7 * 24 * 60 * 60 * 1000
  );

  const buckets: { start: Date; label: string }[] = [];
  for (let i = 0; i < TREND_WEEKS; i++) {
    const start = new Date(windowStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    buckets.push({ start, label: weekLabel(start) });
  }

  function bucketFor(date: Date): number {
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (date >= buckets[i].start) return i;
    }
    return 0;
  }

  const [{ data: sessions }, { data: locations }] = await Promise.all([
    supabase
      .from("feedback_sessions")
      .select("id, rating, location_id, started_at")
      .eq("organization_id", organizationId)
      .gte("started_at", windowStart.toISOString()),
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
  ]);

  // Org-wide + per-location satisfaction per week.
  const satisfactionBuckets: Record<ExperienceRating, number>[] = buckets.map(() => ({
    bad: 0,
    good: 0,
    excellent: 0,
  }));
  const locationBuckets = new Map<string, Record<ExperienceRating, number>[]>();
  for (const loc of locations ?? []) {
    locationBuckets.set(
      loc.id,
      buckets.map(() => ({ bad: 0, good: 0, excellent: 0 }))
    );
  }

  for (const s of sessions ?? []) {
    if (!s.rating) continue;
    const idx = bucketFor(new Date(s.started_at));
    satisfactionBuckets[idx][s.rating]++;
    const locBucket = locationBuckets.get(s.location_id);
    if (locBucket) locBucket[idx][s.rating]++;
  }

  const satisfactionTrend = buckets.map((b, i) => ({
    week: b.label,
    index: satisfactionScore(satisfactionBuckets[i]),
  }));

  const locationNames = (locations ?? []).map((l) => l.name);
  const locationTrend = buckets.map((b, i) => {
    const row: Record<string, string | number | null> = { week: b.label };
    for (const loc of locations ?? []) {
      row[loc.name] = satisfactionScore(locationBuckets.get(loc.id)![i]);
    }
    return row;
  });

  // Category trend — negative categories only, top 5 by total volume in the window.
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const sessionMeta = new Map((sessions ?? []).map((s) => [s.id, s]));
  let categoryTrend: TrendData["categoryTrend"] = buckets.map((b) => ({ week: b.label }));
  let topCategoryLabels: string[] = [];
  if (sessionIds.length > 0) {
    const { data: responses } = (await supabase
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

    const totalByCategory = new Map<string, number>();
    const perBucketByCategory = new Map<string, number[]>();
    for (const r of responses ?? []) {
      const session = sessionMeta.get(r.feedback_session_id);
      if (!session) continue;
      const idx = bucketFor(new Date(session.started_at));
      for (const rc of r.response_categories ?? []) {
        if (!rc.feedback_categories || rc.feedback_categories.kind !== "negative") continue;
        const label = rc.feedback_categories.label;
        totalByCategory.set(label, (totalByCategory.get(label) ?? 0) + 1);
        if (!perBucketByCategory.has(label)) perBucketByCategory.set(label, buckets.map(() => 0));
        perBucketByCategory.get(label)![idx]++;
      }
    }
    topCategoryLabels = [...totalByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CATEGORY_COUNT)
      .map(([label]) => label);
    categoryTrend = buckets.map((b, i) => {
      const row: Record<string, string | number> = { week: b.label };
      for (const label of topCategoryLabels) {
        row[label] = perBucketByCategory.get(label)?.[i] ?? 0;
      }
      return row;
    });
  }

  // Google reviews — raw snapshot history (not bucketed; a snapshot is
  // already a daily point). Requires GOOGLE_PLACES_API_KEY configured and
  // locations with a google_place_id — empty until then, handled by the UI.
  const { data: snapshots } = await supabase
    .from("google_review_snapshots")
    .select("captured_at, rating, review_count, location_id")
    .eq("organization_id", organizationId)
    .gte("captured_at", windowStart.toISOString())
    .order("captured_at", { ascending: true });
  const locNameById = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const googleTrend = (snapshots ?? []).map((s) => ({
    date: new Date(s.captured_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
    rating: s.rating,
    reviewCount: s.review_count,
    locationName: locNameById.get(s.location_id) ?? "",
  }));

  return {
    satisfactionTrend,
    locationTrend,
    locationNames,
    categoryTrend,
    topCategoryLabels,
    googleTrend,
    hasGoogleData: googleTrend.length > 0,
  };
}
