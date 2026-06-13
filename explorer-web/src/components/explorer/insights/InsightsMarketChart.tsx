'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartPeriodControls } from '@/components/explorer/charts/ChartPeriodControls';
import { ChartViewToggle } from '@/components/explorer/charts/ChartViewToggle';
import {
  chartGridProps,
  chartXAxisProps,
  niceYAxisProps,
} from '@/components/explorer/charts/chartAxis';
import { ThemedChartTooltip } from '@/components/explorer/charts/ThemedChartTooltip';
import { InsightsChartPanel } from '@/components/explorer/charts/InsightsChartPanel';
import { useChartTheme } from '@/hooks/useChartTheme';
import { CHART_ANIMATION, CHART_MARGINS } from '@/lib/chartVisuals';
import { fetchMarketHistoryClient } from '@/lib/insights/marketHistory';
import { formatChartAxisDate } from '@/lib/chartDates';
import {
  formatInsightsFooter,
  getChainAccentVar,
  INSIGHTS_HISTORY_PERIODS,
} from '@/lib/insightsChartConfig';
import type { AddressBalanceHistoryPeriodId } from '@/lib/api/types';

const SERIES_COLOR = '#418bca';

export function InsightsMarketChart({ chainId }: { chainId: 'vrm' | 'vrc' }) {
  const colors = useChartTheme();
  const accentVar = getChainAccentVar(chainId);
  const grid = chartGridProps(colors);
  const xAxis = chartXAxisProps(colors);

  const [period, setPeriod] = useState<AddressBalanceHistoryPeriodId>('30d');
  const [currency, setCurrency] = useState<'usd' | 'btc'>('usd');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<
    { label: string; startTime: number; endTime: number; value: number }[]
  >([]);
  const [source, setSource] = useState<string>('unavailable');

  const yAxis = niceYAxisProps(
    colors,
    points.map((point) => point.value),
    { floor: 0, width: 76 }
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMarketHistoryClient(chainId, period, currency);
      setPoints(
        result.points.map((point) => ({
          label: formatChartAxisDate(point.time),
          startTime: point.time,
          endTime: point.time,
          value: point.value,
        }))
      );
      setSource(result.source);
    } catch {
      setError('Unable to load market history.');
    } finally {
      setLoading(false);
    }
  }, [chainId, period, currency]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodMeta = INSIGHTS_HISTORY_PERIODS.find((item) => item.id === period);
  const hasData = points.length > 0;

  const formatPrice = (value: number) =>
    currency === 'usd'
      ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
      : `${value.toFixed(8)} BTC`;

  return (
    <InsightsChartPanel
      chainId={chainId}
      title="Market price"
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ChartViewToggle
            views={[
              { id: 'usd' as const, label: 'USD' },
              { id: 'btc' as const, label: 'BTC' },
            ]}
            view={currency}
            onViewChange={setCurrency}
            loading={loading}
          />
          <ChartPeriodControls
            period={period}
            onPeriodChange={setPeriod}
            loading={loading}
            accentVar={accentVar}
          />
        </div>
      }
      loading={loading && !hasData}
      error={error}
      empty={!loading && !hasData ? 'Market history unavailable.' : null}
      footer={
        hasData
          ? formatInsightsFooter(points.length, periodMeta?.label, `source: ${source}`)
          : loading
            ? 'Updating…'
            : null
      }
    >
      {hasData ? (
        <div className="address-balance-chart h-80 w-full min-h-[320px] sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={CHART_MARGINS}>
              <CartesianGrid {...grid} />
              <XAxis {...xAxis} />
              <YAxis {...yAxis} />
              <Tooltip
                content={
                  <ThemedChartTooltip
                    colors={colors}
                    accentColor={SERIES_COLOR}
                    valueFormatter={(value) => formatPrice(value)}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                name={currency.toUpperCase()}
                stroke={SERIES_COLOR}
                fill={SERIES_COLOR}
                fillOpacity={0.18}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIES_COLOR,
                  stroke: colors.bgPanel,
                  strokeWidth: 2,
                }}
                animationDuration={CHART_ANIMATION.duration}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </InsightsChartPanel>
  );
}
