'use client';

import Link from 'next/link';
import { Activity, Database, Layers, Shield } from 'lucide-react';
import { StatusDot } from '@/components/explorer/ExplorerUi';
import type { ChainSummary } from '@/lib/api/types';
import {
  CHAIN_EXPLORERS,
  CHAIN_THEME,
  getChainTipHeight,
  isChainLive,
  type ChainId,
} from '@/lib/chainDisplay';
import { formatHeight } from '@/components/explorer/ExplorerUi';
import { cn } from '@/lib/utils';

interface HomeNetworkHealthProps {
  vrmSummary: ChainSummary;
  vrcSummary: ChainSummary;
  vrmHeight: number | null;
  vrcHeight: number | null;
}

function computeHealthScore(summary: ChainSummary, chainHeight: number | null): number {
  const health = summary.health;
  const live = isChainLive(health, summary.latestBlocks[0]?.height, chainHeight);
  const blocksBehind = health.heights.blocksBehind ?? 0;
  const gapCount = health.counts.gapCount ?? 0;
  const trusted = health.trusted;

  let score = 100;
  if (!live) score -= 25;
  if (blocksBehind > 10) score -= Math.min(30, blocksBehind);
  if (gapCount > 0) score -= Math.min(20, gapCount * 2);
  if (!trusted) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function HealthCard({
  chainId,
  summary,
  chainHeight,
}: {
  chainId: ChainId;
  summary: ChainSummary;
  chainHeight: number | null;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const theme = CHAIN_THEME[chainId];
  const health = summary.health;
  const live = isChainLive(health, summary.latestBlocks[0]?.height, chainHeight);
  const score = computeHealthScore(summary, chainHeight);
  const tipHeight = chainHeight ?? getChainTipHeight(health);
  const blocksBehind = health.heights.blocksBehind ?? 0;
  const indexedCount = health.counts.indexedBlockCount;
  const addressCount = health.counts.addressCount;
  const gapCount = health.counts.gapCount;

  const metrics: {
    icon: typeof Layers;
    label: string;
    value: string;
    tone?: 'warning' | 'neutral';
  }[] = [
    {
      icon: Layers,
      label: 'Chain tip',
      value: tipHeight != null ? `#${formatHeight(tipHeight)}` : '—',
    },
    {
      icon: Activity,
      label: 'Blocks behind',
      value: blocksBehind === 0 ? 'At tip' : `${blocksBehind.toLocaleString()} behind`,
      tone: blocksBehind > 10 ? 'warning' : 'neutral',
    },
    {
      icon: Database,
      label: 'Indexed blocks',
      value: indexedCount.toLocaleString(),
    },
    {
      icon: Shield,
      label: 'Index gaps',
      value: gapCount === 0 ? 'None' : gapCount.toLocaleString(),
      tone: gapCount > 0 ? 'warning' : 'neutral',
    },
  ];

  return (
    <article
      className="network-health__card"
      style={{ '--health-accent': theme.accent } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusDot tone={live ? 'success' : 'warning'} pulse={live} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: theme.accent }}
            >
              {config.ticker}
            </span>
            <span className="text-xs text-fg-subtle">{config.consensus}</span>
          </div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-fg">{config.name}</h3>
          <p className="mt-0.5 text-xs text-fg-muted">{health.status}</p>
        </div>

        <div
          className="network-health__score-ring relative shrink-0"
          style={{ '--ring-pct': `${score}%` } as React.CSSProperties}
          aria-label={`Health score ${score}%`}
        >
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-fg">
            {score}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-0">
        {metrics.map(({ icon: Icon, label, value, tone }) => (
          <li key={label} className="network-health__metric">
            <span className="flex items-center gap-2 text-fg-muted">
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
              {label}
            </span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                tone === 'warning' ? 'text-warning' : 'text-fg'
              )}
            >
              {value}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
        <span className="text-fg-subtle">{addressCount.toLocaleString()} addresses indexed</span>
        {config.exploreHref ? (
          <Link
            href={config.exploreHref}
            prefetch
            className="font-semibold hover:underline"
            style={{ color: theme.accent }}
          >
            Open chain →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function HomeNetworkHealth({
  vrmSummary,
  vrcSummary,
  vrmHeight,
  vrcHeight,
}: HomeNetworkHealthProps) {
  return (
    <section aria-labelledby="network-health-heading">
      <h2 id="network-health-heading" className="home-dashboard__section-title">
        Network health
      </h2>
      <div className="network-health mt-4">
        <HealthCard chainId="vrm" summary={vrmSummary} chainHeight={vrmHeight} />
        <HealthCard chainId="vrc" summary={vrcSummary} chainHeight={vrcHeight} />
      </div>
    </section>
  );
}
