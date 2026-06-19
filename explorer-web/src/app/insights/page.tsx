import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlertBanner } from '@/components/explorer/ExplorerUi';
import { InsightsDashboard } from '@/components/explorer/insights/InsightsDashboard';
import { InsightsLoadingSkeleton } from '@/components/explorer/RouteLoadingSkeleton';
import { getChainSummary, getHomeMarket, getHomeNetwork } from '@/lib/api/indexer';
import { applyOnChainMarketCap } from '@/lib/enrichMarket';
import { emptyMarketPayload, emptyNetworkPayload } from '@/lib/homeDefaults';
import { pageMetadata, staticPageSeo } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata(staticPageSeo.insights);

export const revalidate = 30;

function parseChainId(value?: string): 'vrm' | 'vrc' {
  return value === 'vrc' ? 'vrc' : 'vrm';
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string }>;
}) {
  const params = await searchParams;
  const chainId = parseChainId(params.chain);

  try {
    const [summary, marketPayload, networkPayload] = await Promise.all([
      getChainSummary(chainId),
      getHomeMarket().catch(() => emptyMarketPayload()),
      getHomeNetwork().catch(() => emptyNetworkPayload()),
    ]);

    const network = chainId === 'vrc' ? networkPayload.vrc : networkPayload.vrm;
    const market = applyOnChainMarketCap(
      chainId === 'vrc' ? marketPayload.vrc : marketPayload.vrm,
      chainId,
      network.supply
    );

    return (
      <Suspense fallback={<InsightsLoadingSkeleton />}>
        <InsightsDashboard
          chainId={chainId}
          summary={summary}
          initialMarket={market}
          initialNetwork={network}
        />
      </Suspense>
    );
  } catch {
    return (
      <AlertBanner title="Insights Unavailable">
        Unable to load insights data from the explorer API.
      </AlertBanner>
    );
  }
}
