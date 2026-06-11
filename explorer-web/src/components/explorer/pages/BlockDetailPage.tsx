import { AlertBanner, formatHeight } from '@/components/explorer/ExplorerUi';
import { BlockDetailLive } from '@/components/explorer/block/BlockDetailLive';
import { Breadcrumb } from '@/components/explorer/Breadcrumb';
import { getBlock, getChainSummary } from '@/lib/api/indexer';
import { CHAIN_EXPLORERS, type ChainId } from '@/lib/chainDisplay';
import { normalizeLimit, normalizeOffset } from '@/lib/utils';

export async function BlockDetailPage({
  chainId,
  hashOrHeight,
  limit,
  offset,
}: {
  chainId: ChainId;
  hashOrHeight: string;
  limit: number;
  offset: number;
}) {
  const chain = CHAIN_EXPLORERS[chainId];

  let result;
  let loadError: string | null = null;
  try {
    result = await getBlock(chainId, hashOrHeight, { limit, offset });
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unable to load block data.';
  }

  let summary;
  try {
    summary = await getChainSummary(chainId);
  } catch {
    summary = null;
  }

  if (loadError || !result) {
    return (
      <AlertBanner title="Block Lookup Failed">
        {loadError ?? 'Unable to load block data.'}
      </AlertBanner>
    );
  }

  if (!result.found || !result.block) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: chain.name, href: chain.exploreHref! },
            { label: 'Blocks', href: chain.exploreHref! },
            { label: hashOrHeight },
          ]}
        />
        <AlertBanner title="Block Not Found">No block matched this height or hash.</AlertBanner>
      </div>
    );
  }

  const block = result.block;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: chain.name, href: chain.exploreHref! },
          { label: 'Blocks', href: chain.exploreHref! },
          { label: `#${formatHeight(block.height)}` },
        ]}
      />

      <BlockDetailLive
        chainId={chainId}
        hashOrHeight={hashOrHeight}
        initialResult={result}
        initialSummary={summary}
        limit={limit}
        offset={offset}
      />
    </div>
  );
}

export function blockDetailSearchParams(searchParams: { limit?: string; offset?: string }) {
  return {
    limit: normalizeLimit(searchParams.limit, 50),
    offset: normalizeOffset(searchParams.offset),
  };
}
