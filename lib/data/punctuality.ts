import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export interface PunctualityFilters {
  organizationId: string;
  locationId?: string;
  startDate: Date;
  endDate: Date;
  /** Pasar el admin client para jobs sin sesión de usuario (ej. un futuro
   * cron de reportes programados), igual que en getDashboardData. */
  client?: SupabaseClient<Database>;
}

export interface PunctualityMemberRow {
  teamMemberId: string;
  name: string;
  locationName: string;
  totalCheckins: number;
  onTimeCount: number;
  lateCount: number;
  onTimeRate: number;
  avgMinutesLate: number;
  totalMinutesLate: number;
}

export interface PunctualityData {
  totalCheckins: number;
  onTimeCount: number;
  lateCount: number;
  onTimeRate: number;
  avgMinutesLate: number;
  members: PunctualityMemberRow[];
  dailyTrend: { date: string; onTime: number; late: number }[];
}

export async function getPunctualityData(filters: PunctualityFilters): Promise<PunctualityData> {
  const supabase = filters.client ?? (await createClient());
  const { organizationId, locationId, startDate, endDate } = filters;

  let query = supabase
    .from("attendance_records")
    .select("id, team_member_id, location_id, checked_in_at, status, minutes_late")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", startDate.toISOString())
    .lt("checked_in_at", endDate.toISOString());
  if (locationId) query = query.eq("location_id", locationId);

  const [{ data: records }, { data: members }, { data: locations }] = await Promise.all([
    query,
    supabase.from("team_members").select("id, name").eq("organization_id", organizationId),
    supabase.from("locations").select("id, name").eq("organization_id", organizationId),
  ]);

  const memberNameById = new Map((members ?? []).map((m) => [m.id, m.name]));
  const locationNameById = new Map((locations ?? []).map((l) => [l.id, l.name]));

  const rows = records ?? [];
  const totalCheckins = rows.length;
  const onTimeCount = rows.filter((r) => r.status === "on_time").length;
  const lateCount = totalCheckins - onTimeCount;
  const onTimeRate = totalCheckins === 0 ? 0 : Math.round((onTimeCount / totalCheckins) * 100);

  const lateRows = rows.filter((r) => r.status === "late");
  const avgMinutesLate =
    lateRows.length === 0 ? 0 : Math.round(lateRows.reduce((s, r) => s + r.minutes_late, 0) / lateRows.length);

  const byMember = new Map<
    string,
    { total: number; onTime: number; late: number; minutesLateSum: number; locationId: string }
  >();
  for (const r of rows) {
    const entry = byMember.get(r.team_member_id) ?? {
      total: 0,
      onTime: 0,
      late: 0,
      minutesLateSum: 0,
      locationId: r.location_id,
    };
    entry.total += 1;
    if (r.status === "on_time") entry.onTime += 1;
    else {
      entry.late += 1;
      entry.minutesLateSum += r.minutes_late;
    }
    byMember.set(r.team_member_id, entry);
  }

  // Peor puntualidad primero — es lo que un gerente quiere ver de entrada
  // para saber a quién hablarle, no una lista alfabética.
  const memberRows: PunctualityMemberRow[] = Array.from(byMember.entries())
    .map(([teamMemberId, e]) => ({
      teamMemberId,
      name: memberNameById.get(teamMemberId) ?? "—",
      locationName: locationNameById.get(e.locationId) ?? "—",
      totalCheckins: e.total,
      onTimeCount: e.onTime,
      lateCount: e.late,
      onTimeRate: e.total === 0 ? 0 : Math.round((e.onTime / e.total) * 100),
      avgMinutesLate: e.late === 0 ? 0 : Math.round(e.minutesLateSum / e.late),
      totalMinutesLate: e.minutesLateSum,
    }))
    .sort((a, b) => a.onTimeRate - b.onTimeRate || b.totalMinutesLate - a.totalMinutesLate);

  const byDay = new Map<string, { onTime: number; late: number }>();
  for (const r of rows) {
    const day = r.checked_in_at.slice(0, 10);
    const entry = byDay.get(day) ?? { onTime: 0, late: 0 };
    if (r.status === "on_time") entry.onTime += 1;
    else entry.late += 1;
    byDay.set(day, entry);
  }
  const dailyTrend = Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalCheckins, onTimeCount, lateCount, onTimeRate, avgMinutesLate, members: memberRows, dailyTrend };
}
