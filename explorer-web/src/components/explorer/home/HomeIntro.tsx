'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StatusDot } from '@/components/explorer/ExplorerUi';
import { CHAIN_EXPLORERS } from '@/lib/chainDisplay';
import { cn } from '@/lib/utils';

interface HomeIntroProps {
  vrmLive: boolean;
  vrcLive: boolean;
}

export function HomeIntro({ vrmLive, vrcLive }: HomeIntroProps) {
  const vrm = CHAIN_EXPLORERS.vrm;
  const vrc = CHAIN_EXPLORERS.vrc;

  return (
    <header className="home-intro">
      <div className="home-intro__mark" aria-hidden>
        <Image src={vrm.logo} alt="" width={36} height={36} className="home-intro__logo" />
        <Image src={vrc.logo} alt="" width={36} height={36} className="home-intro__logo" />
      </div>

      <div className="home-intro__body">
        <p className="home-intro__label">Vericonomy</p>
        <h1 className="home-intro__title">Binary chain explorer</h1>
        <p className="home-intro__lead">
          Two chains, one dashboard — proof-of-work reserve and proof-of-stake currency in real
          time.
        </p>
      </div>

      <div className="home-intro__rail">
        <ChainLiveChip chainId="vrm" name={vrm.name} ticker={vrm.ticker} live={vrmLive} />
        <ChainLiveChip chainId="vrc" name={vrc.name} ticker={vrc.ticker} live={vrcLive} />

        <div className="home-intro__links">
          <IntroLink href={vrm.exploreHref!} chainId="vrm">
            {vrm.name}
          </IntroLink>
          <IntroLink href={vrc.exploreHref!} chainId="vrc">
            {vrc.name}
          </IntroLink>
        </div>
      </div>
    </header>
  );
}

function ChainLiveChip({
  chainId,
  name,
  ticker,
  live,
}: {
  chainId: 'vrm' | 'vrc';
  name: string;
  ticker: string;
  live: boolean;
}) {
  return (
    <div
      className={cn(
        'home-intro__chip',
        chainId === 'vrm' ? 'home-intro__chip--vrm' : 'home-intro__chip--vrc'
      )}
    >
      <StatusDot tone={live ? 'success' : 'neutral'} pulse={live} />
      <span className="home-intro__chip-ticker">{ticker}</span>
      <span className="home-intro__chip-name">{name}</span>
      <span className="home-intro__chip-state">{live ? 'Live' : 'Syncing'}</span>
    </div>
  );
}

function IntroLink({
  href,
  chainId,
  children,
}: {
  href: string;
  chainId: 'vrm' | 'vrc';
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        'home-intro__link',
        chainId === 'vrm' ? 'home-intro__link--vrm' : 'home-intro__link--vrc'
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
