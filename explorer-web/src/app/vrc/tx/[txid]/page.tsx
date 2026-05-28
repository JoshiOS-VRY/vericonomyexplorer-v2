import { TransactionDetailPage } from "@/components/explorer/pages/TransactionDetailPage";

export default async function VrcTransactionPage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const { txid } = await params;
  return <TransactionDetailPage chainId="vrc" txid={txid} />;
}
