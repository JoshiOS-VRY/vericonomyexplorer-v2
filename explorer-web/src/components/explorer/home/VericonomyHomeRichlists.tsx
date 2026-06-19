'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { RichlistBalanceList } from '@/components/explorer/home/RichlistBalanceList';
import { useHomeNetworkLive } from '@/hooks/useHomeNetworkLive';
import type {
  ChainMarket,
  ChainSummary,
  HomeNetworkPayload,
  RichlistResult,
} from '@/lib/api/types';
import { CHAIN_EXPLORERS, chainAddressPath } from '@/lib/chainDisplay';
import { enrichHomeNetworkPayload } from '@/lib/enrichNetwork';
import { formatExplorerUserMessage } from '@/lib/explorerCopy';
import { emptyNetworkPayload } from '@/lib/homeDefaults';
import { resolveRichlistTotalSupply } from '@/lib/richlistSupply';
import { cn } from '@/lib/utils';

interface VericonomyHomeRichlistsProps {
  vrmRichlist: RichlistResult;
  vrcRichlist: RichlistResult;
  vrmSummary: ChainSummary;
  vrcSummary: ChainSummary;
  initialNetwork?: HomeNetworkPayload;
  vrmMarket?: ChainMarket;
  vrcMarket?: ChainMarket;
}

function resolveRichlistSupply(
  chainId: 'vrm' | 'vrc',
  network: HomeNetworkPayload,
  initialNetwork?: HomeNetworkPayload
): number | null {
  const chainNetwork = chainId === 'vrm' ? network.vrm : network.vrc;
  const initialChain = chainId === 'vrm' ? initialNetwork?.vrm : initialNetwork?.vrc;
  const supply = chainNetwork.supply ?? initialChain?.supply ?? null;
  return supply != null && supply > 0 ? supply : null;
}

export function VericonomyHomeRichlists({
  vrmRichlist,
  vrcRichlist,
  vrmSummary,
  vrcSummary,
  initialNetwork,
  vrmMarket,
  vrcMarket,
}: VericonomyHomeRichlistsProps) {
  const { network } = useHomeNetworkLive(initialNetwork ?? emptyNetworkPayload());
  const enrichedNetwork = useMemo(
    () => enrichHomeNetworkPayload(network, vrmSummary, vrcSummary),
    [network, vrmSummary, vrcSummary]
  );

  const vrmSupply = resolveRichlistTotalSupply(
    resolveRichlistSupply('vrm', enrichedNetwork, initialNetwork),
    vrmMarket
  );
  const vrcSupply = resolveRichlistTotalSupply(
    resolveRichlistSupply('vrc', enrichedNetwork, initialNetwork),
    vrcMarket
  );

  return (
    <section className="home-richlists" aria-labelledby="home-richlists-title">
      <div className="home-section-head">
        <div>
          <h2 id="home-richlists-title" className="home-section-head__title">
            Top holders
          </h2>
          <p className="home-section-head__subtitle">
            Largest positive balances on each chain, ranked by supply share.
          </p>
        </div>
      </div>

      <div className="home-richlists__grid grid gap-6 xl:grid-cols-2">
        <ChainRichlistPanel richlist={vrmRichlist} totalSupply={vrmSupply} />
        <ChainRichlistPanel richlist={vrcRichlist} totalSupply={vrcSupply} />
      </div>
    </section>
  );
}

function ChainRichlistPanel({
  richlist,
  totalSupply,
}: {
  richlist: RichlistResult;
  totalSupply: number | null;
}) {
  const config = CHAIN_EXPLORERS[richlist.chainId as 'vrm' | 'vrc'];
  if (!config) return null;

  const chainId = richlist.chainId as 'vrm' | 'vrc';

  return (
    <article
      className={cn(
        'home-richlist-card',
        chainId === 'vrm' ? 'home-richlist-card--vrm' : 'home-richlist-card--vrc'
      )}
      data-chain={chainId}
    >
      <header className="home-richlist-card__head">
        <div className="home-richlist-card__title-wrap">
          <h3 className="home-richlist-card__title">{config.name}</h3>
          <span className="home-richlist-card__ticker">{config.ticker}</span>
        </div>
        {config.richlistHref && richlist.enabled !== false ? (
          <Link href={config.richlistHref} prefetch className="home-richlist-card__action">
            View all
          </Link>
        ) : null}
      </header>

      <div className="home-richlist-card__body">
        {!richlist.enabled && richlist.message ? (
          <p className="home-richlist-card__empty">
            {formatExplorerUserMessage(richlist.message)}
          </p>
        ) : richlist.items.length === 0 ? (
          <p className="home-richlist-card__empty">No ranked balances yet.</p>
        ) : (
          <RichlistBalanceList
            chainId={chainId}
            items={richlist.items}
            totalSupply={totalSupply}
            addressHref={(address) => (config.exploreHref ? chainAddressPath(chainId, address) : '#')}
          />
        )}
      </div>
    </article>
  );
}
