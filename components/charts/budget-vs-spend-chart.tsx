"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export interface BudgetSpendPoint {
  date: string;
  budget: number;
  spend: number;
}

export function BudgetVsSpendChart({ data }: { data: BudgetSpendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} className="font-data" />
        <YAxis tick={{ fontSize: 11 }} className="font-data" tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ fontFamily: "var(--font-mono)", fontSize: 12, borderRadius: 8 }}
          formatter={(v: number) => `$${v.toLocaleString()}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="budget" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} name="Target budget" />
        <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Cumulative spend" />
      </LineChart>
    </ResponsiveContainer>
  );
}
