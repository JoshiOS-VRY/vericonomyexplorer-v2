"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const sample = [
  { label: "Day 1", value: 120 },
  { label: "Day 2", value: 98 },
  { label: "Day 3", value: 140 },
  { label: "Day 4", value: 110 },
  { label: "Day 5", value: 160 },
];

const TxStatsChart = dynamic(
  () => import("@/components/explorer/charts/TxStatsChart").then((module) => module.TxStatsChart),
  {
    ssr: false,
    loading: () => <div className="h-80 animate-pulse rounded-md bg-bg-subtle" />,
  },
);

export default function TxStatsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transaction Stats</h1>
      <Card>
        <CardHeader><CardTitle>Daily Transaction Volume (sample)</CardTitle></CardHeader>
        <CardContent className="h-80">
          <TxStatsChart data={sample} />
        </CardContent>
      </Card>
    </div>
  );
}
