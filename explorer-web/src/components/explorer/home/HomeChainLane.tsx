'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Radio } from 'lucide-react';
import { LiveRelativeTime } from '@/components/explorer/LiveRelativeTime';
import { ExtractedByCell } from '@/components/explorer/block/ExtractedByCell';
import { AnimatedStatValue } from '@/components/explorer/AnimatedStatValue';
import { formatHeight } from '@/components/explorer/ExplorerUi';
import { useLatestBlocksPoll } from '@/hooks/useLatestBlocksPoll';
import type {
  ChainMarket,
  ChainSummary,
  IndexedBlock,
  VrcNetworkStats,
  VrmNetworkStats,
} from '@/lib/api/types';
import {
  CHAIN_EXPLORERS,
  CHAIN_THEME,
  getChainTipHeight,
  type ChainId,
} from '@/lib/chainDisplay';
import {
  formatAvgBlockTimeMin,
  formatHashrateKhPerMin,
  formatHubSupply,
  formatPercent,
  formatUsdCompact,
  formatUsdPrice,
} from '@/lib/formatMarket';
import { isOptimisticTipBlock } from '@/lib/liveBlocksMerge';
import { isVeriumPoolExtracted } from '@/lib/veriumPoolExtracted';
import { cn, formatDifficulty } from '@/lib/utils';

const LANE_BLOCK_COUNT = 8;

interface HomeChainLaneProps {
  chainId: ChainId;
  summary: ChainSummary;
  chainHeight: number | null;
  heightPulse: boolean;
  market: ChainMarket;
  network: VrmNetworkStats | VrcNetworkStats;
  seedBlocks: IndexedBlock[];
}

export function HomeChainLane({
  chainId,
  summary,
  chainHeight,
  heightPulse,
  market,
  network,
  seedBlocks,
}: HomeChainLaneProps) {
  const config = CHAIN_EXPLORERS[chainId];
  const theme = CHAIN_THEME[chainId];
  const displayHeight = chainHeight ?? getChainTipHeight(summary.health);
  const { blocks, isRefreshing, error } = useLatestBlocksPoll(
    chainId,
    seedBlocks,
    chainHeight,
    LANE_BLOCK_COUNT
  );

  return (
    <section
      className={cn('home-lane', `home-lane--${chainId}`)}
      data-chain={chainId}
      style={
        {
          '--lane-accent': theme.accent,
          '--lane-accent-soft': theme.accentSoft,
        } as React.CSSProperties
      }
      aria-labelledby={`home-lane-${chainId}-title`}
    >
      <div className="home-lane__bar" aria-hidden />

      <div className="home-lane__head">
        <div className="home-lane__identity">
          <Image src={config.logo} alt="" width={32} height={32} className="home-lane__logo" />
          <div>
            <div className="home-lane__title-row">
              <h2 id={`home-lane-${chainId}-title`} className="home-lane__title">
                {config.name}
              </h2>
              <span className="home-lane__ticker">{config.ticker}</span>
              <span className="home-lane__live">
                <Radio className={cn('h-3 w-3', isRefreshing && 'animate-pulse')} aria-hidden />
                Live feed
              </span>
            </div>
            <p className="home-lane__consensus">{config.consensus}</p>
          </div>
        </div>

        <div className="home-lane__head-stats">
          <div className="home-lane__height">
            <span className="home-lane__height-label">Height</span>
            <AnimatedStatValue
              value={formatHeight(displayHeight)}
              numericValue={displayHeight ?? undefined}
              pulse={heightPulse}
              className="home-lane__height-value"
            />
          </div>
          {config.exploreHref ? (
            <Link href={config.exploreHref} prefetch className="home-lane__explore">
              Open explorer
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <p className="home-lane__error">{error}</p> : null}

      <div className="home-lane__feed-wrap">
        {blocks.length === 0 ? (
          <p className="home-lane__empty">Waiting for blocks…</p>
        ) : (
          <div className="home-lane__feed" aria-label={`Latest ${config.ticker} blocks`}>
            {blocks.map((block, index) => (
              <HomeBlockCard
                key={block.hash}
                block={block}
                chainId={chainId}
                isNewest={index === 0}
                blockHref={config.blockHref?.(block.height)}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="home-lane__metrics">
        {chainId === 'vrm' ? (
          <VrmMetricChips network={network as VrmNetworkStats} market={market} ticker={config.ticker} />
        ) : (
          <VrcMetricChips network={network as VrcNetworkStats} market={market} ticker={config.ticker} />
        )}
      </footer>
    </section>
  );
}

function HomeBlockCard({
  block,
  chainId,
  isNewest,
  blockHref,
}: {
  block: IndexedBlock;
  chainId: ChainId;
  isNewest: boolean;
  blockHref?: string;
}) {
  const indexing = isOptimisticTipBlock(block, chainId);
  const hash = block.hash.replace(/^0x/i, '');
  const hashShort = hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;

  const inner = (
    <>
      <div className="home-block-card__top">
        <span className="home-block-card__height">#{formatHeight(block.height)}</span>
        {isNewest ? <span className="home-block-card__new">New</span> : null}
      </div>
      <p className="home-block-card__hash" title={block.hash}>
        {hashShort}
      </p>
      <div className="home-block-card__meta">
        <span>{formatHeight(block.txCount)} tx</span>
        <span>
          {indexing ? '…' : <LiveRelativeTime time={block.time} interval="second" />}
        </span>
      </div>
      <div className="home-block-card__producer">
        {chainId === 'vrm' ? (
          indexing ? (
            <span className="text-fg-subtle">Indexing…</span>
          ) : (
            <ExtractedByCell
              block={block}
              chainId={chainId}
              className={
                isVeriumPoolExtracted(block)
                  ? undefined
                  : 'text-xs font-medium text-[var(--lane-accent)] hover:underline'
              }
            />
          )
        ) : indexing ? (
          <span className="text-fg-subtle">Indexing…</span>
        ) : (
          <span className="tabular-nums">{formatPercent(block.interestRatePercent)} interest</span>
        )}
      </div>
    </>
  );

  if (blockHref) {
    return (
      <Link href={blockHref} prefetch className={cn('home-block-card', isNewest && 'home-block-card--new')}>
        {inner}
      </Link>
    );
  }

  return <article className={cn('home-block-card', isNewest && 'home-block-card--new')}>{inner}</article>;
}

function VrmMetricChips({
  network,
  market,
  ticker,
}: {
  network: VrmNetworkStats;
  market: ChainMarket;
  ticker: string;
}) {
  const chips = [
    { label: 'Hashrate', value: formatHashrateKhPerMin(network.hashrateKhPerMin) },
    {
      label: 'Difficulty',
      value: network.difficulty != null ? formatDifficulty(String(network.difficulty)) : '—',
    },
    { label: 'Supply', value: formatHubSupply(network.supply, ticker) },
    { label: 'Avg block', value: formatAvgBlockTimeMin(network.avgBlockTimeMin) },
    { label: 'USD', value: formatUsdPrice(market.usd) },
    { label: 'Market cap', value: formatUsdCompact(market.marketCap) },
  ];
  return <MetricChipRow chips={chips} />;
}

function VrcMetricChips({
  network,
  market,
  ticker,
}: {
  network: VrcNetworkStats;
  market: ChainMarket;
  ticker: string;
}) {
  const chips = [
    { label: 'Interest', value: formatPercent(network.interestRatePercent) },
    { label: 'Staked', value: formatPercent(network.percentStaked) },
    { label: 'Supply', value: formatHubSupply(network.supply, ticker) },
    {
      label: 'Difficulty',
      value: network.difficulty != null ? formatDifficulty(String(network.difficulty)) : '—',
    },
    { label: 'USD', value: formatUsdPrice(market.usd) },
    { label: 'Market cap', value: formatUsdCompact(market.marketCap) },
  ];
  return <MetricChipRow chips={chips} />;
}

function MetricChipRow({ chips }: { chips: { label: string; value: string }[] }) {
  return (
    <div className="home-lane__chips">
      {chips.map((chip) => (
        <span key={chip.label} className="home-lane__chip">
          <span className="home-lane__chip-label">{chip.label}</span>
          <span className="home-lane__chip-value">{chip.value}</span>
        </span>
      ))}
    </div>
  );
}
