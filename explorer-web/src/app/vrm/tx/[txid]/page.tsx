import { TransactionDetailPage } from "@/components/explorer/pages/TransactionDetailPage";

export default async function VrmTransactionPage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const { txid } = await params;
  return <TransactionDetailPage chainId="vrm" txid={txid} />;
}
