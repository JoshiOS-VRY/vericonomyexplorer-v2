'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
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
    <header className="home-intro home-intro--cinematic">
      <div className="home-intro__mesh" aria-hidden>
        <div className="home-intro__orb home-intro__orb--vrm" />
        <div className="home-intro__orb home-intro__orb--vrc" />
      </div>

      <motion.div
        className="home-intro__mark"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
        aria-hidden
      >
        <Image src={vrm.logo} alt="" width={44} height={44} className="home-intro__logo" />
        <Image src={vrc.logo} alt="" width={44} height={44} className="home-intro__logo" />
      </motion.div>

      <motion.div
        className="home-intro__body"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
      >
        <p className="home-intro__label">
          <Sparkles className="home-intro__spark" aria-hidden />
          Vericonomy
        </p>
        <h1 className="home-intro__title">
          <span className="home-intro__title-line">Binary chain</span>
          <span className="home-intro__title-accent">explorer</span>
        </h1>
        <p className="home-intro__lead">
          Proof-of-work reserve and proof-of-stake currency — indexed, live, and unified in one
          cinematic dashboard.
        </p>
      </motion.div>

      <motion.div
        className="home-intro__rail"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16 }}
      >
        <ChainLiveChip chainId="vrm" name={vrm.name} ticker={vrm.ticker} live={vrmLive} />
        <ChainLiveChip chainId="vrc" name={vrc.name} ticker={vrc.ticker} live={vrcLive} />

        <div className="home-intro__links">
          <IntroLink href={vrm.exploreHref!} chainId="vrm">
            Explore {vrm.ticker}
          </IntroLink>
          <IntroLink href={vrc.exploreHref!} chainId="vrc">
            Explore {vrc.ticker}
          </IntroLink>
        </div>
      </motion.div>
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
      <span className={cn('home-intro__chip-state', live && 'home-intro__chip-state--live')}>
        {live ? 'Live' : 'Syncing'}
      </span>
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
