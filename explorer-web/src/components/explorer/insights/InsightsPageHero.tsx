'use client';

import Link from 'next/link';
import { BarChart3, LineChart } from 'lucide-react';
import { StatusDot } from '@/components/explorer/ExplorerUi';
import { getChainAccentVar } from '@/lib/insightsChartConfig';
import { cn } from '@/lib/utils';

export function InsightsPageHero({
  chainId,
  live,
  onChainChange,
}: {
  chainId: 'vrm' | 'vrc';
  live: boolean;
  onChainChange: (chain: 'vrm' | 'vrc') => void;
}) {
  return (
    <header className="insights-hero">
      <div className="insights-hero__orb" aria-hidden />
      <div className="insights-hero__body">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" aria-hidden />
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                live ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              )}
            >
              <StatusDot tone={live ? 'success' : 'warning'} pulse={live} />
              {live ? 'Live metrics' : 'Updating'}
            </span>
          </div>
          <h1 className="insights-hero__title">Insights</h1>
          <p className="insights-hero__subtitle">
            Network hashrate, difficulty, supply, staking, address growth, chain activity, and
            market history — unified for both Verium and VeriCoin.
          </p>
          <Link href={`/${chainId}`} className="chain-hero__link mt-4 inline-flex">
            <LineChart className="h-3.5 w-3.5" aria-hidden />
            Open {chainId === 'vrm' ? 'Verium' : 'VeriCoin'} explorer
          </Link>
        </div>

        <div className="insights-chain-toggle" role="group" aria-label="Select chain">
          {(['vrm', 'vrc'] as const).map((item) => {
            const active = chainId === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onChainChange(item)}
                className={cn(
                  'insights-chain-toggle__btn',
                  active ? 'insights-chain-toggle__btn--active' : 'insights-chain-toggle__btn--idle'
                )}
                style={active ? { background: getChainAccentVar(item) } : undefined}
                aria-pressed={active}
              >
                {item === 'vrm' ? 'Verium' : 'VeriCoin'}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
