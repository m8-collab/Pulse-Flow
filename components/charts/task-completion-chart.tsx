"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export interface TaskTrendPoint {
  date: string;
  completed: number;
  total: number;
}

export function TaskCompletionChart({ data }: { data: TaskTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} className="font-data" allowDecimals={false} />
        <Tooltip contentStyle={{ fontFamily: "var(--font-mono)", fontSize: 12, borderRadius: 8 }} />
        <Area type="monotone" dataKey="total" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeDasharray="4 4" name="Total tasks" />
        <Area type="monotone" dataKey="completed" stroke="hsl(var(--primary))" fill="url(#completedFill)" strokeWidth={2} name="Completed" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
