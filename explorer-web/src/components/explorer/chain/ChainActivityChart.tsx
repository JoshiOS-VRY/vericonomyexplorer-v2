'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChartPeriodControls } from '@/components/explorer/charts/ChartPeriodControls';
import { ChartViewToggle } from '@/components/explorer/charts/ChartViewToggle';
import { ActivityBarChart } from '@/components/explorer/charts/ActivityBarChart';
import { InsightsChartPanel } from '@/components/explorer/charts/InsightsChartPanel';
import { AddressChartSkeleton } from '@/components/explorer/address/AddressSectionSkeleton';
import {
  CHAIN_ACTIVITY_HISTORY_PERIODS,
  fetchChainActivityHistoryClient,
} from '@/lib/chainActivityHistory';
import { useChainActivityHistoryPoll } from '@/hooks/useChainActivityHistoryPoll';
import { formatInsightsFooter, getChainAccentVar } from '@/lib/insightsChartConfig';
import type {
  AddressBalanceHistoryPeriodId,
  ChainActivityChartView,
  ChainActivityHistoryResult,
} from '@/lib/api/types';
import type { ChainId } from '@/lib/chainDisplay';

const CHART_VIEWS: { id: ChainActivityChartView; label: string }[] = [
  { id: 'activity', label: 'Activity' },
  { id: 'blocks', label: 'Blocks' },
];

export function ChainActivityChart({ chainId }: { chainId: ChainId }) {
  const [view, setView] = useState<ChainActivityChartView>('activity');
  const [period, setPeriod] = useState<AddressBalanceHistoryPeriodId>('30d');
  const [history, setHistory] = useState<ChainActivityHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultHistoryRef = useRef<ChainActivityHistoryResult | null>(null);
  const accent = getChainAccentVar(chainId);

  const loadPeriod = useCallback(
    async (nextPeriod: AddressBalanceHistoryPeriodId) => {
      setLoading(true);
      setError(null);

      try {
        const nextHistory = await fetchChainActivityHistoryClient(chainId, nextPeriod);
        if (nextPeriod === '30d') {
          defaultHistoryRef.current = nextHistory;
        }
        setHistory(nextHistory);
        setPeriod(nextPeriod);
      } catch {
        setError('Unable to load chart data for this period.');
      } finally {
        setLoading(false);
      }
    },
    [chainId]
  );

  useEffect(() => {
    void loadPeriod('30d');
  }, [loadPeriod]);

  useChainActivityHistoryPoll({
    chainId,
    period,
    history,
    onHistory: setHistory,
    onDefaultHistory: (next) => {
      defaultHistoryRef.current = next;
    },
    enabled: Boolean(history),
  });

  const handlePeriodChange = (next: AddressBalanceHistoryPeriodId) => {
    if (next === period || loading) {
      return;
    }

    if (next === '30d' && defaultHistoryRef.current) {
      setHistory(defaultHistoryRef.current);
      setPeriod('30d');
      setError(null);
      return;
    }

    void loadPeriod(next);
  };

  if (!history) {
    return <AddressChartSkeleton />;
  }

  const periodMeta = CHAIN_ACTIVITY_HISTORY_PERIODS.find((item) => item.id === period);
  const panelTitle = view === 'blocks' ? 'Block production' : 'Chain activity';

  const activityData = history.buckets.map((bucket) => ({
    label: bucket.label,
    startTime: bucket.startTime,
    endTime: bucket.endTime,
    mined: bucket.minedCount,
    staked: bucket.stakedCount,
    received: bucket.receivedCount,
  }));

  const blocksData = history.buckets.map((bucket) => ({
    label: bucket.label,
    startTime: bucket.startTime,
    endTime: bucket.endTime,
    blocks: bucket.blockCount,
  }));

  const hasActivity = activityData.some(
    (row) => row.mined > 0 || row.staked > 0 || row.received > 0
  );
  const hasBlocks = blocksData.some((row) => row.blocks > 0);
  const hasData = view === 'blocks' ? hasBlocks : hasActivity;

  return (
    <InsightsChartPanel
      chainId={chainId}
      title={panelTitle}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ChartViewToggle
            views={CHART_VIEWS}
            view={view}
            onViewChange={setView}
            loading={loading}
          />
          <ChartPeriodControls
            period={period}
            onPeriodChange={handlePeriodChange}
            loading={loading}
            accentVar={accent}
          />
        </div>
      }
      loading={loading && !hasData}
      error={error}
      empty={
        !loading && !hasData
          ? history.backfillRequired
            ? 'Historical chain activity is still being collected.'
            : `No ${view === 'blocks' ? 'blocks' : 'transactions'} in the ${periodMeta?.label ?? 'selected'} period.`
          : !history.buckets.length && !loading
            ? 'No chain activity data available yet.'
            : null
      }
      footer={
        loading
          ? 'Updating…'
          : hasData
            ? formatInsightsFooter(history.buckets.length, periodMeta?.label)
            : null
      }
    >
      {hasData ? (
        <ActivityBarChart
          chainId={chainId}
          view={view}
          activityData={activityData}
          blocksData={blocksData}
        />
      ) : null}
    </InsightsChartPanel>
  );
}
