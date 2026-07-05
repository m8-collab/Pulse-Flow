"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

export interface RoiPoint {
  name: string;
  roi: number;
}

export function RoiBarChart({ data }: { data: RoiPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} className="font-data" tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={{ fontFamily: "var(--font-mono)", fontSize: 12, borderRadius: 8 }}
          formatter={(v: number) => `${v.toFixed(1)}%`}
        />
        <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.roi >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
