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
  { height: "100k", difficulty: 1.2 },
  { height: "200k", difficulty: 1.5 },
  { height: "300k", difficulty: 1.8 },
  { height: "400k", difficulty: 2.1 },
];

export default function DifficultyHistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Difficulty History</h1>
      <Card>
        <CardHeader><CardTitle>Difficulty Trend (sample)</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sample}>
              <XAxis dataKey="height" stroke="rgb(var(--fg-subtle))" fontSize={11} />
              <YAxis stroke="rgb(var(--fg-subtle))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "rgb(var(--bg-panel))",
                  border: "1px solid rgb(var(--border))",
                  borderRadius: 6,
                }}
              />
              <Line type="monotone" dataKey="difficulty" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
