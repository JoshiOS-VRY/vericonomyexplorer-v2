import { LazyAddressBalanceChart } from "@/components/explorer/address/LazyAddressBalanceChart";
import { getAddressBalanceHistory } from "@/lib/api/indexer";

export async function AddressBalanceChartSection({
  chainId,
  address,
}: {
  chainId: string;
  address: string;
}) {
  let initialHistory = null;

  try {
    initialHistory = await getAddressBalanceHistory(chainId, address);
  } catch {
    initialHistory = null;
  }

  return (
    <LazyAddressBalanceChart
      chainId={chainId}
      address={address}
      initialHistory={initialHistory ?? undefined}
    />
  );
}
