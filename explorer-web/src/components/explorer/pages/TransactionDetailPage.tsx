import {
  AlertBanner,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { EntityHero } from "@/components/explorer/BlockDetail";
import { Breadcrumb } from "@/components/explorer/Breadcrumb";
import { TxAddressStory } from "@/components/explorer/tx/TxAddressStory";
import { TxAdvancedPanel } from "@/components/explorer/tx/TxAdvancedPanel";
import { TxBlockNav } from "@/components/explorer/tx/TxBlockNav";
import { TxFlowDiagram } from "@/components/explorer/tx/TxFlowDiagram";
import { TxMetricStrip } from "@/components/explorer/tx/TxMetricStrip";
import { TxRelatedActivityClient } from "@/components/explorer/tx/TxRelatedActivityClient";
import { TxShareActions } from "@/components/explorer/tx/TxShareActions";
import { TxStatusBar } from "@/components/explorer/tx/TxStatusBar";
import { getTransaction } from "@/lib/api/indexer";
import {
  CHAIN_EXPLORERS,
  chainBlockPath,
  type ChainId,
} from "@/lib/chainDisplay";
import { ellipsizeMiddle } from "@/lib/utils";

export async function TransactionDetailPage({
  chainId,
  txid,
}: {
  chainId: ChainId;
  txid: string;
}) {
  const chain = CHAIN_EXPLORERS[chainId];

  let result;
  try {
    result = await getTransaction(chainId, txid);
  } catch {
    return (
      <AlertBanner title="Transaction Lookup Failed">Unable to load transaction data.</AlertBanner>
    );
  }

  if (!result.found || !result.transaction) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[{ label: chain.name, href: chain.exploreHref! }, { label: "Transaction" }]}
        />
        <AlertBanner title="Transaction Not Found">
          This transaction was not found in the explorer.
        </AlertBanner>
      </div>
    );
  }

  const tx = result.transaction;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: chain.name, href: chain.exploreHref! },
          { label: "Block", href: chainBlockPath(chainId, tx.blockHeight) },
          { label: ellipsizeMiddle(tx.txid, 16) },
        ]}
      />

      <EntityHero
        eyebrow={`${chain.name} transaction`}
        title={ellipsizeMiddle(tx.txid, 24)}
        hash={tx.txid}
        badges={<TxShareActions chainId={chainId} txid={tx.txid} />}
        meta={
          <span className="text-xs text-fg-muted">
            Block {formatHeight(tx.blockHeight)} · position {formatHeight(tx.txIndex)}
          </span>
        }
      />

      <TxStatusBar result={result} chainId={chainId} />
      <TxFlowDiagram result={result} chainId={chainId} />
      <TxMetricStrip result={result} />
      <TxAddressStory events={result.addressEvents} chainId={chainId} />
      <TxBlockNav result={result} chainId={chainId} />
      <TxAdvancedPanel result={result} chainId={chainId} />
      <TxRelatedActivityClient chainId={chainId} txid={tx.txid} result={result} />
    </div>
  );
}
