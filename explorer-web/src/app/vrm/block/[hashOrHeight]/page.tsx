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
import { normalizeLimit, normalizeOffset } from "@/lib/utils";

export default async function BlockPage({
  params,
  searchParams,
}: {
  params: Promise<{ hashOrHeight: string }>;
  searchParams: Promise<{ limit?: string; offset?: string }>;
}) {
  const { hashOrHeight } = await params;
  const query = await searchParams;
  const limit = normalizeLimit(query.limit, 50);
  const offset = normalizeOffset(query.offset);

  let result;
  let loadError: string | null = null;
  try {
    result = await getBlock("vrm", hashOrHeight, { limit, offset });
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
            { label: "Verium", href: "/vrm" },
            { label: "Blocks", href: "/vrm" },
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
          { label: "Verium", href: "/vrm" },
          { label: "Blocks", href: "/vrm" },
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
        actions={<BlockShareActions hash={block.hash} height={block.height} />}
      />

      <BlockStatusBar result={result} />
      <BlockMiningCard result={result} />
      <BlockMetricStrip result={result} />
      <BlockTxTable result={result} blockHeight={block.height} />
      <BlockAdvancedPanel result={result} />
    </div>
  );
}
