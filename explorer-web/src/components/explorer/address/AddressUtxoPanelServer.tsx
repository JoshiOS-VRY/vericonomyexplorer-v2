import { AddressUtxoPanel } from "@/components/explorer/address/AddressUtxoPanel";
import { getAddressUtxos } from "@/lib/api/indexer";
import type { ChainId } from "@/lib/chainDisplay";

export async function AddressUtxoPanelServer({
  chainId,
  address,
  basePath,
  utxoLimit,
  utxoOffset,
}: {
  chainId: string;
  address: string;
  basePath: string;
  utxoLimit: number;
  utxoOffset: number;
}) {
  let utxos = null;

  try {
    utxos = await getAddressUtxos(chainId, address, {
      limit: utxoLimit,
      offset: utxoOffset,
    });
  } catch {
    return (
      <section className="rounded-lg border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <p className="text-sm text-fg-muted">Unable to load UTXO data.</p>
      </section>
    );
  }

  return (
    <AddressUtxoPanel
      chainId={chainId as ChainId}
      utxos={utxos}
      basePath={basePath}
    />
  );
}
