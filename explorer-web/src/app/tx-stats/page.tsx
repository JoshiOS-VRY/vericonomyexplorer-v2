"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const sample = [
  { label: "Day 1", value: 120 },
  { label: "Day 2", value: 98 },
  { label: "Day 3", value: 140 },
  { label: "Day 4", value: 110 },
  { label: "Day 5", value: 160 },
];

export default function TxStatsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transaction Stats</h1>
      <Card>
        <CardHeader><CardTitle>Daily Transaction Volume (sample)</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sample}>
              <XAxis dataKey="label" stroke="rgb(var(--fg-subtle))" fontSize={11} />
              <YAxis stroke="rgb(var(--fg-subtle))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "rgb(var(--bg-panel))",
                  border: "1px solid rgb(var(--border))",
                  borderRadius: 6,
                }}
              />
              <Line type="monotone" dataKey="value" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
