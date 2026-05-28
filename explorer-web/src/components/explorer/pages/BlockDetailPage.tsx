import { AlertBanner, formatHeight } from "@/components/explorer/ExplorerUi";
import { BlockDetailHero } from "@/components/explorer/BlockDetail";
import { Breadcrumb } from "@/components/explorer/Breadcrumb";
import { BlockAdvancedPanel } from "@/components/explorer/block/BlockAdvancedPanel";
import { BlockMetricStrip } from "@/components/explorer/block/BlockMetricStrip";
import { BlockMiningCard } from "@/components/explorer/block/BlockMiningCard";
import { BlockShareActions } from "@/components/explorer/block/BlockShareActions";
import { BlockStatusBar } from "@/components/explorer/block/BlockStatusBar";
import { BlockTxTable } from "@/components/explorer/block/BlockTxTable";
import { getBlock } from "@/lib/api/indexer";
import { CHAIN_EXPLORERS, type ChainId } from "@/lib/chainDisplay";
import { normalizeLimit, normalizeOffset } from "@/lib/utils";

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
    loadError = err instanceof Error ? err.message : "Unable to load block data.";
  }

  if (loadError || !result) {
    return (
      <AlertBanner title="Block Lookup Failed">
        {loadError ?? "Unable to load block data."}
      </AlertBanner>
    );
  }

  if (!result.found || !result.block) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: chain.name, href: chain.exploreHref! },
            { label: "Blocks", href: chain.exploreHref! },
            { label: hashOrHeight },
          ]}
        />
        <AlertBanner title="Block Not Found">No block matched this height or hash.</AlertBanner>
      </div>
    );
  }

  const block = result.block;
  const blockTime = result.transactions.find((tx) => tx.time)?.time ?? block.time ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: chain.name, href: chain.exploreHref! },
          { label: "Blocks", href: chain.exploreHref! },
          { label: `#${formatHeight(block.height)}` },
        ]}
      />

      <BlockDetailHero
        height={block.height}
        hash={block.hash}
        blockTime={blockTime}
        txCount={block.txCount}
        size={block.size ?? null}
        difficulty={block.difficulty}
        previousHash={block.previousHash}
        nextHash={block.nextHash}
        actions={
          <BlockShareActions chainId={chainId} hash={block.hash} height={block.height} />
        }
      />

      <BlockStatusBar result={result} />
      <BlockMiningCard result={result} chainId={chainId} />
      <BlockMetricStrip result={result} />
      <BlockTxTable result={result} blockHeight={block.height} chainId={chainId} />
      <BlockAdvancedPanel result={result} chainId={chainId} />
    </div>
  );
}

export function blockDetailSearchParams(searchParams: {
  limit?: string;
  offset?: string;
}) {
  return {
    limit: normalizeLimit(searchParams.limit, 50),
    offset: normalizeOffset(searchParams.offset),
  };
}
