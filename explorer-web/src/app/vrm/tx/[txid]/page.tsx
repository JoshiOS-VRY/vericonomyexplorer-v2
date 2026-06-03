import type { Metadata } from "next";
import { TransactionDetailPage } from "@/components/explorer/pages/TransactionDetailPage";
import { transactionPageMetadata } from "@/lib/seo/dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ txid: string }>;
}): Promise<Metadata> {
  const { txid } = await params;
  return transactionPageMetadata("vrm", txid);
}

export default async function VrmTransactionPage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const { txid } = await params;
  return <TransactionDetailPage chainId="vrm" txid={txid} />;
}
