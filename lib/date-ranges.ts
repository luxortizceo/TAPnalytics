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

// `new Date("2026-01-01")` parses a date-only string as UTC midnight (per
// the ECMAScript spec), while every other date in this file is built and
// read in local time. In any timezone west of UTC — including
// America/Mexico_City, this app's default — that UTC midnight lands on the
// *previous* local day, silently shifting a custom report range by almost
// 24 hours. Parsing the y/m/d components directly into a local Date avoids
// the UTC/local mismatch entirely.
function parseDateOnlyLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  // Reject overflow like "2026-02-30", which JS would otherwise silently
  // roll into March 2nd.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function resolvePeriod(
  period: string | undefined,
  from: string | undefined,
  to: string | undefined
): { key: PeriodKey; start: Date; end: Date } {
  const now = new Date();

  if (period === "custom" && from && to) {
    const start = parseDateOnlyLocal(from);
    const end = parseDateOnlyLocal(to);
    if (start && end) {
      end.setHours(23, 59, 59, 999);
      if (start <= end) {
        return { key: "custom", start, end };
      }
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
