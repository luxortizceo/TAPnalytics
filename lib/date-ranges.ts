export type PeriodKey = "today" | "yesterday" | "7d" | "30d" | "custom";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  custom: "Personalizado",
};

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function resolvePeriod(
  period: string | undefined,
  from: string | undefined,
  to: string | undefined
): { key: PeriodKey; start: Date; end: Date } {
  const now = new Date();

  if (period === "custom" && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      return { key: "custom", start, end };
    }
  }

  if (period === "yesterday") {
    const end = startOfDay(now);
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { key: "yesterday", start, end };
  }

  if (period === "7d") {
    return { key: "7d", start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
  }

  if (period === "30d") {
    return { key: "30d", start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
  }

  return { key: "today", start: startOfDay(now), end: now };
}
