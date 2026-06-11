'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const sample = [
  { height: '100k', difficulty: 1.2 },
  { height: '200k', difficulty: 1.5 },
  { height: '300k', difficulty: 1.8 },
  { height: '400k', difficulty: 2.1 },
];

const DifficultyHistoryChart = dynamic(
  () =>
    import('@/components/explorer/charts/DifficultyHistoryChart').then(
      (module) => module.DifficultyHistoryChart
    ),
  {
    ssr: false,
    loading: () => <div className="h-80 animate-pulse rounded-md bg-bg-subtle" />,
  }
);

export default function DifficultyHistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Difficulty History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Difficulty Trend (sample)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <DifficultyHistoryChart data={sample} />
        </CardContent>
      </Card>
    </div>
  );
}
