import type { Metadata } from 'next';
import { AlertBanner, PageHero } from '@/components/explorer/ExplorerUi';
import { VrmMinersPageClient } from '@/components/explorer/vrm/VrmMinersPageClient';
import { getMinersLeaderboard } from '@/lib/api/indexer';
import { formatExplorerUserMessage } from '@/lib/explorerCopy';
import { normalizeMinersPeriod, type MinersPeriodId } from '@/lib/minersPeriods';
import { normalizeLimit, normalizeOffset } from '@/lib/utils';
import { pageMetadata, staticPageSeo } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata(staticPageSeo.vrmMiners);

export default async function MinersPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    limit?: string;
    offset?: string;
  }>;
}) {
  const params = await searchParams;
  const period: MinersPeriodId = normalizeMinersPeriod(params.period, 'month');
  const limit = normalizeLimit(params.limit, 50);
  const offset = normalizeOffset(params.offset);

  let miners;
  try {
    miners = await getMinersLeaderboard('vrm', { period, limit, offset });
  } catch {
    return <AlertBanner title="Miners Unavailable">Unable to load VRM top miners.</AlertBanner>;
  }

  if (!miners.enabled && miners.message) {
    return (
      <div className="space-y-6">
        <PageHero
          title="Verium Top Miners"
          subtitle="Addresses ranked by coinbase rewards earned."
        />
        <AlertBanner title="Miners Disabled">
          {formatExplorerUserMessage(miners.message)}
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Verium Top Miners"
        subtitle="Addresses ranked by VRM earned from block rewards in the selected period."
      />
      <VrmMinersPageClient
        key={`${period}-${offset}`}
        initialMiners={miners}
        initialPeriod={period}
        limit={limit}
        offset={offset}
      />
    </div>
  );
}
