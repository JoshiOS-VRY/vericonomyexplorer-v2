'use client';

/**
 * Chain-level activity charts (tx counts on hub/insights pages).
 * Address balance activity uses AddressActivityChart.tsx instead.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CountChartTooltip } from '@/components/explorer/charts/ThemedChartTooltip';
import { useChartTheme } from '@/hooks/useChartTheme';
import {
  chartGridProps,
  chartXAxisProps,
  niceYAxisProps,
} from '@/components/explorer/charts/chartAxis';
import { CHART_ANIMATION, CHART_MARGINS } from '@/lib/chartVisuals';

type ActivityRow = {
  label: string;
  startTime: number;
  endTime: number;
  mined: number;
  staked: number;
  received: number;
};

type BlocksRow = {
  label: string;
  startTime: number;
  endTime: number;
  blocks: number;
};

export function ActivityBarChart({
  chainId,
  view,
  activityData,
  blocksData,
  accentColor = '#418bca',
}: {
  chainId: 'vrm' | 'vrc';
  view: 'activity' | 'blocks';
  activityData: ActivityRow[];
  blocksData: BlocksRow[];
  accentColor?: string;
}) {
  const colors = useChartTheme();
  const yDomainValues =
    view === 'blocks'
      ? blocksData.map((row) => row.blocks)
      : activityData.map((row) =>
          chainId === 'vrc' ? row.staked + row.received : row.mined + row.received
        );
  const grid = chartGridProps(colors);
  const xAxis = chartXAxisProps(colors);
  const yAxis = niceYAxisProps(colors, yDomainValues, { floor: 0, width: 76 });
  const tickFill = colors.fgSubtle || '#64748b';

  return (
    <div className="address-balance-chart h-80 w-full min-h-[320px] sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        {view === 'blocks' ? (
          <BarChart data={blocksData} margin={CHART_MARGINS}>
            <CartesianGrid {...grid} />
            <XAxis {...xAxis} />
            <YAxis {...yAxis} />
            <Tooltip
              content={
                <CountChartTooltip colors={colors} unit="blocks" accentColor={accentColor} />
              }
            />
            <Bar
              dataKey="blocks"
              name="Blocks"
              fill={accentColor}
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              animationDuration={CHART_ANIMATION.duration}
            />
          </BarChart>
        ) : (
          <BarChart data={activityData} margin={CHART_MARGINS} stackOffset="sign">
            <CartesianGrid {...grid} />
            <XAxis {...xAxis} />
            <YAxis {...yAxis} />
            <Tooltip
              content={<CountChartTooltip colors={colors} unit="tx" accentColor={accentColor} />}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: tickFill, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            {/* VeriCoin (PoST) blocks pair a coinbase + coinstake, so mining and
                staking are the same event. Show one production bar per chain to
                avoid double-counting: "Staked" for VRC, "Mined" for VRM. */}
            {chainId === 'vrc' ? (
              <Bar
                dataKey="staked"
                name="Staked"
                stackId="a"
                fill={colors.success || '#359b37'}
                animationDuration={CHART_ANIMATION.duration}
              />
            ) : (
              <Bar
                dataKey="mined"
                name="Mined"
                stackId="a"
                fill={colors.success || '#359b37'}
                animationDuration={CHART_ANIMATION.duration}
              />
            )}
            <Bar
              dataKey="received"
              name="Transfers"
              stackId="a"
              fill={colors.accent || '#418bca'}
              radius={[4, 4, 0, 0]}
              animationDuration={CHART_ANIMATION.duration}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
