import Link from "next/link";
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
import { ellipsizeMiddle } from "@/lib/utils";

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const { txid } = await params;
  let result;
  try {
    result = await getTransaction("vrm", txid);
  } catch {
    return <AlertBanner title="Transaction Lookup Failed">Unable to load transaction data.</AlertBanner>;
  }

  if (!result.found || !result.transaction) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: "Verium", href: "/vrm" }, { label: "Transaction" }]} />
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
          { label: "Verium", href: "/vrm" },
          { label: "Block", href: `/vrm/block/${tx.blockHeight}` },
          { label: ellipsizeMiddle(tx.txid, 16) },
        ]}
      />

      <EntityHero
        eyebrow="Verium transaction"
        title={ellipsizeMiddle(tx.txid, 24)}
        hash={tx.txid}
        badges={<TxShareActions txid={tx.txid} />}
        meta={
          <span className="text-xs text-fg-muted">
            Block {formatHeight(tx.blockHeight)} · position {formatHeight(tx.txIndex)}
          </span>
        }
      />

      <TxStatusBar result={result} />
      <TxFlowDiagram result={result} />
      <TxMetricStrip result={result} />
      <TxAddressStory events={result.addressEvents} />
      <TxBlockNav result={result} />
      <TxAdvancedPanel result={result} />
      <TxRelatedActivityClient chainId="vrm" txid={tx.txid} result={result} />
    </div>
  );
}
