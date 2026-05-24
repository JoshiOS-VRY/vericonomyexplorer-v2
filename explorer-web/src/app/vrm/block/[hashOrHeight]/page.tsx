import {
  AlertBanner,
  PaginationLinks,
  TxTypeBadge,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import {
  BcHashLink,
  BcPageHeader,
  BcPanel,
} from "@/components/explorer/BlockchairUi";
import { BlockChainNav } from "@/components/explorer/BlockDetail";
import { Breadcrumb } from "@/components/explorer/Breadcrumb";
import { getBlock } from "@/lib/api/indexer";
import { formatDifficulty, formatUnixTime, normalizeLimit, normalizeOffset } from "@/lib/utils";

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
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Verium", href: "/vrm" },
          { label: "Blocks", href: "/vrm" },
          { label: `#${formatHeight(block.height)}` },
        ]}
      />

      <BcPageHeader
        title={`Block ${formatHeight(block.height)}`}
        subtitle={blockTime ? formatUnixTime(blockTime) : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip label="Transactions" value={formatHeight(block.txCount)} />
        <StatChip label="Size" value={block.size != null ? `${formatHeight(block.size)} B` : "—"} />
        <StatChip label="Difficulty" value={block.difficulty ? formatDifficulty(block.difficulty) : "—"} />
        <StatChip label="Hash" value={<BcHashLink href={`/vrm/block/${block.hash}`} value={`${block.hash.slice(0, 16)}…`} />} />
      </div>

      <BcPanel title="Block hash" flush>
        <p className="break-all px-4 py-3 font-mono text-sm text-fg-muted sm:px-5">{block.hash}</p>
        <BlockChainNav
          height={block.height}
          previousHash={block.previousHash}
          nextHash={block.nextHash}
        />
      </BcPanel>

      <BcPanel
        title="Transactions"
        flush
        action={
          <span className="text-xs font-semibold tabular-nums text-fg-muted">
            {formatHeight(block.txCount)} total
          </span>
        }
      >
        {result.transactions.length === 0 ? (
          <p className="px-5 py-4 text-sm text-fg-muted">No transactions found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="bc-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {result.transactions.map((tx) => (
                    <tr key={tx.txid}>
                      <td className="tabular-nums text-fg-subtle">{tx.txIndex ?? "—"}</td>
                      <td>
                        <BcHashLink href={`/vrm/tx/${tx.txid}`} value={tx.txid} />
                      </td>
                      <td>
                        <TxTypeBadge isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} />
                      </td>
                      <td className="text-fg-muted">{tx.time ? formatUnixTime(tx.time) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-5 py-4">
              <PaginationLinks basePath={`/vrm/block/${block.height}`} paging={result.paging} />
            </div>
          </>
        )}
      </BcPanel>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bc-stat rounded-lg border border-border bg-bg-panel p-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="mt-1 text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}
