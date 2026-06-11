import type { Metadata } from 'next';
import { getBlock, getTransaction, getAddress } from '@/lib/api/indexer';
import { CHAIN_EXPLORERS, type ChainId } from '@/lib/chainDisplay';
import { pageMetadata } from '@/lib/seo/metadata';
import { shortenHex } from '@/lib/seo/site';

export async function blockPageMetadata(chainId: ChainId, hashOrHeight: string): Promise<Metadata> {
  const chain = CHAIN_EXPLORERS[chainId];
  const path = `/${chainId}/block/${encodeURIComponent(hashOrHeight)}`;

  try {
    const result = await getBlock(chainId, hashOrHeight, { limit: 1, offset: 0 });
    if (result.found && result.block) {
      const { height, hash, txCount } = result.block;
      const title = `${chain.ticker} Block #${height.toLocaleString('en-US')}`;
      const description = `${chain.name} block at height ${height} with ${txCount} transaction${txCount === 1 ? '' : 's'}. Hash ${shortenHex(hash)}.`;
      return pageMetadata({ title, description, path });
    }
  } catch {
    /* fall through to generic metadata */
  }

  return pageMetadata({
    title: `${chain.ticker} Block Lookup`,
    description: `Look up a ${chain.name} block by height or hash on Vericonomy Explorer.`,
    path,
  });
}

export async function transactionPageMetadata(chainId: ChainId, txid: string): Promise<Metadata> {
  const chain = CHAIN_EXPLORERS[chainId];
  const path = `/${chainId}/tx/${encodeURIComponent(txid)}`;

  try {
    const result = await getTransaction(chainId, txid);
    if (result.found && result.transaction) {
      const tx = result.transaction;
      const title = `${chain.ticker} Transaction ${shortenHex(txid)}`;
      const out = tx.summary?.totalOutput;
      const outputLabel = out ? `${out.amount} ${out.ticker}` : null;
      const parts = [
        `${chain.name} transaction`,
        `in block #${tx.blockHeight}`,
        outputLabel != null ? `total output ${outputLabel}` : null,
      ].filter(Boolean);
      const description = `${parts.join(' ')}. Txid ${shortenHex(txid)}.`;
      return pageMetadata({ title, description, path });
    }
  } catch {
    /* fall through */
  }

  return pageMetadata({
    title: `${chain.ticker} Transaction`,
    description: `View a ${chain.name} transaction by txid on Vericonomy Explorer.`,
    path,
  });
}

export async function addressPageMetadata(chainId: ChainId, address: string): Promise<Metadata> {
  const chain = CHAIN_EXPLORERS[chainId];
  const path = `/${chainId}/address/${encodeURIComponent(address)}`;

  try {
    const result = await getAddress(chainId, address, {
      limit: 1,
      offset: 0,
      includeRank: true,
    });
    if (result.found) {
      const bal = result.balance?.balance;
      const balanceLabel = bal ? `${bal.amount} ${bal.ticker}` : null;
      const txCount = result.balance?.txCount ?? 0;
      const rank = result.richlist?.rank;
      const title = `${chain.ticker} Address ${shortenHex(address, 6, 6)}`;
      const rankPart = rank != null ? ` Rich list rank #${rank}.` : '';
      const description = `${chain.name} address with balance ${balanceLabel ?? '—'} and ${txCount} indexed transaction${txCount === 1 ? '' : 's'}.${rankPart} Address ${shortenHex(address, 10, 10)}.`;
      return pageMetadata({ title, description, path });
    }
  } catch {
    /* fall through */
  }

  return pageMetadata({
    title: `${chain.ticker} Address`,
    description: `Explore a ${chain.name} wallet address — balance, transactions, and UTXOs on Vericonomy Explorer.`,
    path,
  });
}
