"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
