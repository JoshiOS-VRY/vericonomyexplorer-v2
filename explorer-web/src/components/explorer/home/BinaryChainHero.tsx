'use client';

import Image from 'next/image';
import { Search } from 'lucide-react';
import { ChainExploreButton } from '@/components/explorer/home/ChainExploreButton';
import { StatusDot } from '@/components/explorer/ExplorerUi';
import { CHAIN_EXPLORERS } from '@/lib/chainDisplay';
import { cn } from '@/lib/utils';

interface BinaryChainHeroProps {
  vrmLive: boolean;
  vrcLive: boolean;
}

export function BinaryChainHero({ vrmLive, vrcLive }: BinaryChainHeroProps) {
  const vrm = CHAIN_EXPLORERS.vrm;
  const vrc = CHAIN_EXPLORERS.vrc;

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__glow home-hero__glow--vrm" aria-hidden />
      <div className="home-hero__glow home-hero__glow--vrc" aria-hidden />

      <div className="home-hero__inner">
        <div className="home-hero__main">
          <div className="home-hero__logos" aria-hidden>
            <Image
              src={vrm.logo}
              alt=""
              width={48}
              height={48}
              className="home-hero__logo home-hero__logo--vrm"
            />
            <Image
              src={vrc.logo}
              alt=""
              width={48}
              height={48}
              className="home-hero__logo home-hero__logo--vrc"
            />
          </div>

          <div className="home-hero__copy">
            <p className="home-hero__eyebrow">Vericonomy · Binary chain</p>
            <h1 id="home-hero-title" className="home-hero__title">
              Block Explorer
            </h1>
            <p className="home-hero__subtitle">
              Live blocks, network metrics, and top balances for Verium (PoWT) and VeriCoin (PoST).
            </p>
          </div>
        </div>

        <div className="home-hero__aside">
          <div className="home-hero__pills">
            <LivePill chainId="vrm" ticker={vrm.ticker} live={vrmLive} />
            <LivePill chainId="vrc" ticker={vrc.ticker} live={vrcLive} />
          </div>

          <div className="home-hero__search-hint">
            <Search className="home-hero__search-icon" aria-hidden />
            <span>Search by block, transaction, or address in the header</span>
          </div>

          <div className="home-hero__actions">
            <ChainExploreButton chainId="vrm" label="Verium" />
            <ChainExploreButton chainId="vrc" label="VeriCoin" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LivePill({
  chainId,
  ticker,
  live,
}: {
  chainId: 'vrm' | 'vrc';
  ticker: string;
  live: boolean;
}) {
  return (
    <span
      className={cn(
        'home-hero__pill',
        chainId === 'vrm' ? 'home-hero__pill--vrm' : 'home-hero__pill--vrc',
        live && 'home-hero__pill--live'
      )}
    >
      <StatusDot tone={live ? 'success' : 'neutral'} pulse={live} />
      <span className="home-hero__pill-ticker">{ticker}</span>
      <span className="home-hero__pill-status">{live ? 'Live' : 'Syncing'}</span>
    </span>
  );
}
