import type { Metadata } from "next";
import { TransactionDetailPage } from "@/components/explorer/pages/TransactionDetailPage";
import { transactionPageMetadata } from "@/lib/seo/dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ txid: string }>;
}): Promise<Metadata> {
  const { txid } = await params;
  return transactionPageMetadata("vrc", txid);
}

export default async function VrcTransactionPage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const { txid } = await params;
  return <TransactionDetailPage chainId="vrc" txid={txid} />;
}
