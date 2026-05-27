"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DifficultyHistoryChart({
  data,
}: {
  data: Array<{ height: string; difficulty: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="height" stroke="rgb(var(--fg-subtle))" fontSize={11} />
        <YAxis stroke="rgb(var(--fg-subtle))" fontSize={11} />
        <Tooltip />
        <Line type="monotone" dataKey="difficulty" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
