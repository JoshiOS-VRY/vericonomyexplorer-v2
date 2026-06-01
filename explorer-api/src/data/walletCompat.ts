// Compatibility layer for the Vericonomy desktop wallet.
//
// The wallet historically consumed the legacy `/rest/api/1/*` explorer REST
// API (flat arrays, camelCase fields like `nTx`, `outputT`, `miner.address`).
// These mappers re-expose the v2 indexer + node RPC data in those legacy shapes
// so the wallet only needs to change its base URL, not its parsers.

import { rpc } from "../rpc/index.js";
import type { ChainId } from "../types.js";
import { fetchHomeMarketOnly, fetchHomeNetwork } from "./home.js";
import {
  fetchChainSummary,
  fetchLatestBlocks,
  fetchMinedLeaderboard,
} from "./legacy.js";

const RPC_TIMEOUT_MS = 8_000;

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  const num = toNumberOrNull(value);
  if (num != null) return String(num);
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Legacy `ExplorerStats` shape (snake_case) the wallet deserializes directly. */
export interface WalletStats {
  network_hash: number | null;
  supply: number | null;
  height: number | null;
  block_reward: number | null;
  difficulty: number | null;
  blocks_per_hour: number | null;
  block_time_min: number | null;
  pooled_tx: number | null;
  price_usd: number | null;
  price_btc: number | null;
  market_cap_usd: number | null;
  volume_24h_usd: number | null;
  stake_interest: number | null;
  stake_inflation: number | null;
  net_stake_weight: number | null;
  pos_difficulty: number | null;
  pow_difficulty: number | null;
  fetched_at: number;
  source: string;
}

function readPosPowDifficulty(
  chainId: ChainId,
  mining: Record<string, unknown> | null,
): { difficulty: number | null; pos: number | null; pow: number | null } {
  const raw = mining?.difficulty;
  if (chainId === "vrc" && raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const pos = toNumberOrNull(obj["proof-of-stake"]);
    const pow = toNumberOrNull(obj["proof-of-work"]);
    return { difficulty: pos, pos, pow };
  }
  const flat = toNumberOrNull(raw);
  return { difficulty: flat, pos: null, pow: null };
}

export async function buildWalletStats(chainId: ChainId): Promise<WalletStats> {
  const [network, market, miningResult] = await Promise.all([
    fetchHomeNetwork().catch(() => null),
    fetchHomeMarketOnly().catch(() => null),
    rpc(chainId)
      .call<Record<string, unknown>>("getmininginfo", [], RPC_TIMEOUT_MS)
      .catch(() => null),
  ]);

  const mining = miningResult ?? null;
  const net = (network ? network[chainId] : null) as Record<
    string,
    unknown
  > | null;
  const mkt = (market ? market[chainId] : null) as Record<
    string,
    unknown
  > | null;
  const { difficulty, pos, pow } = readPosPowDifficulty(chainId, mining);

  const networkHashPs =
    toNumberOrNull(mining?.networkhashps) ??
    // VRM network payload exposes kH/min; convert back to H/s for the wallet.
    (toNumberOrNull(net?.hashrateKhPerMin) != null
      ? (toNumberOrNull(net?.hashrateKhPerMin) as number) * (1000 / 60)
      : null);

  return {
    network_hash: networkHashPs,
    supply: toNumberOrNull(net?.supply),
    height: toNumberOrNull(mining?.blocks) ?? toNumberOrNull(net?.blocks),
    block_reward: toNumberOrNull(mining?.blockreward),
    difficulty: difficulty ?? toNumberOrNull(net?.difficulty),
    blocks_per_hour: toNumberOrNull(mining?.blocksperhour),
    block_time_min: toNumberOrNull(mining?.blocktime),
    pooled_tx: toNumberOrNull(mining?.pooledtx),
    price_usd: toNumberOrNull(mkt?.usd),
    price_btc: toNumberOrNull(mkt?.btc),
    market_cap_usd: toNumberOrNull(mkt?.marketCap),
    volume_24h_usd: toNumberOrNull(mkt?.volume24h),
    stake_interest:
      chainId === "vrc" ? toNumberOrNull(mining?.stakeinterest) : null,
    stake_inflation:
      chainId === "vrc" ? toNumberOrNull(mining?.stakeinflation) : null,
    net_stake_weight:
      chainId === "vrc" ? toNumberOrNull(mining?.netstakeweight) : null,
    pos_difficulty: pos,
    pow_difficulty: pow,
    fetched_at: Math.floor(Date.now() / 1000),
    source: "",
  };
}

/** Legacy block object shape consumed by the wallet's `fetch_blocks`. */
export interface WalletBlock {
  id: number;
  hash: string;
  height: number;
  time: number;
  mint: string | null;
  difficulty: string | null;
  nTx: number | null;
  miner: { address: string | null };
  strippedsize: number | null;
  outputT: string | null;
  outputC: number | null;
}

function mapIndexedBlock(block: Record<string, unknown>): WalletBlock | null {
  const height = toNumberOrNull(block.height);
  const hash = typeof block.hash === "string" ? block.hash : null;
  if (height == null || hash == null) return null;

  return {
    id: height,
    hash,
    height,
    time: toNumberOrNull(block.time) ?? 0,
    mint: toStringOrNull(block.mint ?? block.outputTotal ?? block.outputValue),
    difficulty: toStringOrNull(block.difficulty),
    nTx: toNumberOrNull(block.txCount),
    miner: {
      address:
        typeof block.extractedByAddress === "string"
          ? block.extractedByAddress
          : typeof block.extractedBy === "string"
            ? block.extractedBy
            : null,
    },
    strippedsize: toNumberOrNull(block.size),
    outputT: toStringOrNull(
      block.outputTotal ?? block.outputValue ?? block.mint,
    ),
    outputC: toNumberOrNull(block.outputCount),
  };
}

export async function buildWalletBlocks(
  chainId: ChainId,
  limit: number,
): Promise<WalletBlock[]> {
  const blocks = (await fetchLatestBlocks(chainId)) as unknown[];
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter(
      (b): b is Record<string, unknown> => b != null && typeof b === "object",
    )
    .map(mapIndexedBlock)
    .filter((b): b is WalletBlock => b != null)
    .slice(0, limit);
}

/** Legacy transaction object shape consumed by the wallet's `fetch_transactions`. */
export interface WalletTransaction {
  id: number;
  txid: string;
  time: number;
  fee: string | null;
  outputT: string | null;
  blocks: Array<{ height: number | null; hash: string | null }>;
}

function mapIndexedTransaction(
  tx: Record<string, unknown>,
  index: number,
): WalletTransaction | null {
  const txid = typeof tx.txid === "string" ? tx.txid : null;
  if (txid == null) return null;

  const summary = (tx.summary ?? null) as Record<string, unknown> | null;
  const totalOutput = summary?.totalOutput as
    | Record<string, unknown>
    | undefined;
  const fee = summary?.fee as Record<string, unknown> | undefined;
  const blockHeight = toNumberOrNull(tx.blockHeight);
  const blockHash = typeof tx.blockHash === "string" ? tx.blockHash : null;

  return {
    id: blockHeight ?? index,
    txid,
    time: toNumberOrNull(tx.time) ?? 0,
    fee: toStringOrNull(fee?.amount),
    outputT: toStringOrNull(totalOutput?.amount),
    blocks:
      blockHeight != null ? [{ height: blockHeight, hash: blockHash }] : [],
  };
}

export async function buildWalletTransactions(
  chainId: ChainId,
  limit: number,
): Promise<WalletTransaction[]> {
  const summary = (await fetchChainSummary(chainId)) as {
    recentTransactions?: unknown[];
  };
  const txs = summary?.recentTransactions;
  if (!Array.isArray(txs)) return [];
  return txs
    .filter(
      (t): t is Record<string, unknown> => t != null && typeof t === "object",
    )
    .map(mapIndexedTransaction)
    .filter((t): t is WalletTransaction => t != null)
    .slice(0, limit);
}

/** Legacy extraction (top miners) shape consumed by the wallet's `fetch_extraction`. */
export interface WalletExtractionEntry {
  rank: string | null;
  address: string;
  count: string | null;
}

export async function buildWalletExtraction(
  chainId: ChainId,
  limit: number,
  period = "month",
): Promise<WalletExtractionEntry[]> {
  const result = (await fetchMinedLeaderboard(chainId, { limit, period })) as {
    items?: unknown[];
  };
  const items = result?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (i): i is Record<string, unknown> => i != null && typeof i === "object",
    )
    .map((item) => {
      const address = typeof item.address === "string" ? item.address : null;
      if (address == null) return null;
      return {
        rank: toStringOrNull(item.rank),
        address,
        count: toStringOrNull(item.blockCount),
      };
    })
    .filter((e): e is WalletExtractionEntry => e != null)
    .slice(0, limit);
}

/** Legacy chain-tips shape consumed by the wallet's `fetch_chain_tips`. */
export interface WalletChainTip {
  id: number;
  height: number;
  hash: string;
  branchlen: number;
  status: { name: string | null };
}

export async function buildWalletChainTips(
  chainId: ChainId,
): Promise<WalletChainTip[]> {
  const tips = await rpc(chainId)
    .call<unknown[]>("getchaintips", [], RPC_TIMEOUT_MS)
    .catch(() => null);
  if (!Array.isArray(tips)) return [];
  return tips
    .filter(
      (t): t is Record<string, unknown> => t != null && typeof t === "object",
    )
    .map((tip, index) => {
      const height = toNumberOrNull(tip.height);
      const hash = typeof tip.hash === "string" ? tip.hash : null;
      if (height == null || hash == null) return null;
      return {
        id: index,
        height,
        hash,
        branchlen: toNumberOrNull(tip.branchlen) ?? 0,
        status: { name: typeof tip.status === "string" ? tip.status : null },
      };
    })
    .filter((t): t is WalletChainTip => t != null);
}

/** Legacy peer shape (snake_case) the wallet deserializes directly. */
export interface WalletPeer {
  id: number;
  address: string;
  ip: string;
  port: number;
  subversion: string;
  protocol_version: number;
  connected_on_explorer: boolean;
  last_seen: string | null;
}

function splitHostPort(addr: string): { ip: string; port: number | null } {
  // IPv6 form: [::1]:1234
  const bracket = addr.match(/^\[(.+)\]:(\d+)$/);
  if (bracket) return { ip: bracket[1], port: Number(bracket[2]) };
  const lastColon = addr.lastIndexOf(":");
  if (lastColon > -1 && addr.indexOf(":") === lastColon) {
    return {
      ip: addr.slice(0, lastColon),
      port: Number(addr.slice(lastColon + 1)),
    };
  }
  return { ip: addr, port: null };
}

export async function buildWalletPeers(
  chainId: ChainId,
  limit: number,
): Promise<WalletPeer[]> {
  const peers = await rpc(chainId)
    .call<unknown[]>("getpeerinfo", [], RPC_TIMEOUT_MS)
    .catch(() => null);
  if (!Array.isArray(peers)) return [];

  const mapped: WalletPeer[] = [];
  for (const raw of peers) {
    if (raw == null || typeof raw !== "object") continue;
    const peer = raw as Record<string, unknown>;
    const addr = typeof peer.addr === "string" ? peer.addr : null;
    if (addr == null) continue;
    const { ip, port } = splitHostPort(addr);
    mapped.push({
      id: toNumberOrNull(peer.id) ?? mapped.length,
      address: addr,
      ip,
      port: port ?? 0,
      subversion: typeof peer.subver === "string" ? peer.subver : "",
      protocol_version: toNumberOrNull(peer.version) ?? 0,
      connected_on_explorer: true,
      last_seen:
        toNumberOrNull(peer.lastrecv) != null
          ? new Date(
              (toNumberOrNull(peer.lastrecv) as number) * 1000,
            ).toISOString()
          : null,
    });
  }

  return mapped.slice(0, limit);
}
