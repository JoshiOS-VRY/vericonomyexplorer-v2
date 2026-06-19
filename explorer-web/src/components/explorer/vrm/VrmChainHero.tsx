import Image from 'next/image';
import Link from 'next/link';
import { BarChart3, Radio } from 'lucide-react';
import { StatusDot, formatHeight } from '@/components/explorer/ExplorerUi';
import type { ChainHealth, IndexedBlock } from '@/lib/api/types';
import { CHAIN_EXPLORERS, CHAIN_THEME, isChainLive } from '@/lib/chainDisplay';
import { cn } from '@/lib/utils';

export function ChainExplorerHero({
  chainId,
  health,
  chainHeight,
  heightPulse,
  tipBlock,
}: {
  chainId: 'vrm' | 'vrc';
  health: ChainHealth;
  chainHeight: number | null;
  heightPulse: boolean;
  tipBlock: IndexedBlock | undefined;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const theme = CHAIN_THEME[chainId];
  const live = isChainLive(health, tipBlock?.height, chainHeight);
  const tipHref = tipBlock && config.blockHref ? config.blockHref(tipBlock.height) : null;
  const chainLabel = chainId === 'vrm' ? 'Verium blockchain' : 'VeriCoin blockchain';
  const description =
    chainId === 'vrm'
      ? 'Proof-of-work-time reserve chain — blocks, mining, transactions, and addresses indexed in real time.'
      : 'Proof-of-stake-time currency chain — staking, transfers, and balances indexed in real time.';

  return (
    <section
      className="chain-hero"
      style={
        {
          '--hub-accent': theme.accent,
          '--hub-accent-soft': theme.accentSoft,
          '--hub-glow': chainId === 'vrm' ? 'var(--glow-vrm)' : 'var(--glow-vrc)',
        } as React.CSSProperties
      }
    >
      <div className="chain-hero__mesh" aria-hidden>
        <div className="chain-hero__orb chain-hero__orb--primary" />
      </div>

      <div className="chain-hero__body">
        <div className="chain-hero__top">
          <div className="chain-hero__identity">
            <Image src={config.logo} alt="" width={52} height={52} className="chain-hero__logo" />
            <div>
              <p className="chain-hero__eyebrow">{chainLabel}</p>
              <div className="chain-hero__title-row">
                <h1 className="chain-hero__title">{config.name}</h1>
                <span className="chain-hero__ticker">{config.ticker}</span>
                <span className="chain-hero__consensus">{config.consensus}</span>
              </div>
              <p className="chain-hero__desc">{description}</p>

              <div className="chain-hero__actions">
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
                    live
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-border bg-bg-subtle text-fg-muted'
                  )}
                >
                  <StatusDot tone={live ? 'success' : 'neutral'} pulse={live} />
                  {live ? 'Live' : 'Syncing'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                  <Radio className={cn('h-3 w-3', live && 'animate-pulse')} aria-hidden />
                  Real-time feed
                </span>
                <Link href={`/insights?chain=${chainId}`} className="chain-hero__link">
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                  Insights
                </Link>
                {tipHref ? (
                  <Link href={tipHref} className="chain-hero__link">
                    Latest block →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {chainHeight != null ? (
            <div className="chain-hero__height-block">
              <p className="chain-hero__height-label">Block height</p>
              <p className={cn('chain-hero__height-value', heightPulse && 'live-height-pulse')}>
                {formatHeight(chainHeight)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** @deprecated Use ChainExplorerHero with chainId="vrm" */
export function VrmChainHero({
  health,
  chainHeight,
  heightPulse,
  tipBlock,
}: {
  health: ChainHealth;
  chainHeight: number | null;
  heightPulse: boolean;
  tipBlock: IndexedBlock | undefined;
}) {
  return (
    <ChainExplorerHero
      chainId="vrm"
      health={health}
      chainHeight={chainHeight}
      heightPulse={heightPulse}
      tipBlock={tipBlock}
    />
  );
}
