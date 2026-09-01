"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

// Cycled across locations/categories — kept distinct enough at a glance
// without introducing new design tokens just for charts.
const PALETTE = [
  "var(--color-tech-green-400)",
  "var(--color-racing-red-400)",
  "var(--color-amber-400)",
  "var(--color-silver-300)",
  "var(--color-tech-green-600)",
];

const AXIS_PROPS = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--color-surface-2)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--color-foreground)",
  },
};

export function SatisfactionTrendChart({ data }: { data: { week: string; index: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="week" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} domain={[0, 100]} unit="%" />
        <Tooltip {...TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="index"
          name="Índice de satisfacción"
          stroke="var(--color-tech-green-400)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function LocationTrendChart({
  data,
  locationNames,
}: {
  data: Array<Record<string, string | number | null>>;
  locationNames: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="week" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} domain={[0, 100]} unit="%" />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }} />
        {locationNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryTrendChart({
  data,
  categoryLabels,
}: {
  data: Array<Record<string, string | number>>;
  categoryLabels: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="week" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} allowDecimals={false} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }} />
        {categoryLabels.map((label, i) => (
          <Line
            key={label}
            type="monotone"
            dataKey={label}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GoogleRatingTrendChart({
  data,
}: {
  data: { date: string; rating: number | null; reviewCount: number | null; locationName: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="date" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} domain={[0, 5]} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="rating"
          name="Calificación en Google"
          stroke="var(--color-amber-400)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
