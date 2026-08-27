"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PERIOD_LABELS, type PeriodKey } from "@/lib/date-ranges";

// RatingChart lives here too (used to be components/dashboard/rating-chart.tsx)
// to keep the repo's file count down — both are dashboard-only client bits.
export function RatingChart({ counts }: { counts: { bad: number; good: number; excellent: number } }) {
  const data = [
    { name: "Mala", value: counts.bad, fill: "var(--color-racing-red-500)" },
    { name: "Buena", value: counts.good, fill: "var(--color-silver-400)" },
    { name: "Excelente", value: counts.excellent, fill: "var(--color-tech-green-500)" },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "var(--color-surface-2)" }}
          contentStyle={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--color-foreground)",
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PeriodFilter({
  period,
  from,
  to,
  locations,
  locationId,
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
  locations: { id: string; name: string }[];
  locationId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function applyParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={period} onValueChange={(v) => applyParams({ period: v, from: undefined, to: undefined })}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
            <SelectItem key={k} value={k}>
              {PERIOD_LABELS[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              applyParams({ period: "custom", from: customFrom, to: e.target.value });
            }}
            className="w-40"
          />
        </div>
      )}

      {locations.length > 0 && (
        <Select
          value={locationId ?? "all"}
          onValueChange={(v) => applyParams({ locationId: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las sucursales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
