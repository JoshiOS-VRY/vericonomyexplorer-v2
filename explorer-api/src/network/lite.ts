import { runIndexerQuery } from "../db/queryPool.js";
import { rpc } from "../rpc/index.js";
import type { ChainId } from "../types.js";
import type { VrcNetworkStats, VrmNetworkStats } from "../types/home.js";
import {
  getMaxSupply,
  getTargetBlockTimeSeconds,
  hashPerSecToKhPerMin,
  parseRpcNumber,
  parseVrcMiningInfo,
  type RpcCall,
} from "./stats.js";

const HOT_RPC_TIMEOUT_MS = Number(process.env.VCEXP_HOT_RPC_TIMEOUT_MS ?? 4_000);
const HOT_INDEXER_TIMEOUT_MS = Number(process.env.VCEXP_HOT_INDEXER_TIMEOUT_MS ?? 3_000);

function rpcCall(chainId: ChainId): RpcCall {
  const client = rpc(chainId);
  return (method, params = [], timeoutMs = HOT_RPC_TIMEOUT_MS) =>
    client.call(method, params, timeoutMs);
}

async function fetchIndexedTipHeight(chainId: ChainId): Promise<number | null> {
  try {
    const summary = (await runIndexerQuery(
      "getChainSummaryLiteIndexed",
      [chainId],
      { skipLiveBlocks: true, skipLiveRpc: true, limit: 1 },
      { timeoutMs: HOT_INDEXER_TIMEOUT_MS, priority: 0 },
    )) as { latestBlocks?: { height: number }[] };

    return summary?.latestBlocks?.[0]?.height ?? null;
  } catch {
    return null;
  }
}

async function fetchIndexedSupply(chainId: ChainId, height: number): Promise<number | null> {
  try {
    const result = (await runIndexerQuery(
      "getIndexedSupplyAtHeight",
      [chainId],
      { height },
      { timeoutMs: HOT_INDEXER_TIMEOUT_MS, priority: 0 },
    )) as { supply?: number | null };

    const supply = result?.supply;
    return typeof supply === "number" && Number.isFinite(supply) && supply > 0
      ? supply
      : null;
  } catch {
    return null;
  }
}

function difficultyToHashrateKhPerMin(difficulty: number, chainId: ChainId): number | null {
  if (!Number.isFinite(difficulty) || difficulty <= 0) {
    return null;
  }

  const targetBlockTimeSeconds = getTargetBlockTimeSeconds(chainId);
  const hashPerSec = (difficulty * 2 ** 32) / targetBlockTimeSeconds;
  return hashPerSec > 0 ? hashPerSecToKhPerMin(hashPerSec) : null;
}

/** Lightweight network stats for hot paths (home, SSR). No gettxoutsetinfo or long hashrate scans. */
export async function fetchVrmNetworkStatsLite(): Promise<VrmNetworkStats> {
  const call = rpcCall("vrm");

  try {
    const [blockchainInfo, miningInfo] = await Promise.all([
      call("getblockchaininfo").catch(() => null),
      call("getmininginfo").catch(() => null),
    ]);

    const blockchain = blockchainInfo as {
      blocks?: unknown;
      difficulty?: unknown;
      totalsupply?: unknown;
    } | null;
    const mining = miningInfo as {
      blocksperhour?: unknown;
      blocktime?: unknown;
    } | null;

    let blocks = parseRpcNumber(blockchain?.blocks);
    const difficulty = parseRpcNumber(blockchain?.difficulty);

    if (blocks == null) {
      blocks = await fetchIndexedTipHeight("vrm");
    }

    const rpcSupply = parseRpcNumber(blockchain?.totalsupply);
    const supply =
      rpcSupply != null && rpcSupply > 0
        ? rpcSupply
        : blocks != null
          ? await fetchIndexedSupply("vrm", blocks)
          : null;

    const blocksPerHour = parseRpcNumber(mining?.blocksperhour);
    const blockTimeMinTarget = parseRpcNumber(mining?.blocktime);
    const avgBlockTimeMin =
      blocksPerHour != null && blocksPerHour > 0
        ? 60 / blocksPerHour
        : blockTimeMinTarget != null && blockTimeMinTarget > 0
          ? blockTimeMinTarget
          : null;

    return {
      hashrateKhPerMin:
        difficulty != null ? difficultyToHashrateKhPerMin(difficulty, "vrm") : null,
      avgBlockTimeMin,
      blocksPerHour,
      difficulty,
      blocks,
      supply,
      maxSupply: getMaxSupply("vrm"),
    };
  } catch {
    const blocks = await fetchIndexedTipHeight("vrm");
    const supply = blocks != null ? await fetchIndexedSupply("vrm", blocks) : null;

    return {
      hashrateKhPerMin: null,
      avgBlockTimeMin: null,
      blocksPerHour: null,
      difficulty: null,
      blocks,
      supply,
      maxSupply: getMaxSupply("vrm"),
    };
  }
}

/** Lightweight VRC network stats for hot paths. Skips gettxoutsetinfo and legacy staking fallbacks. */
export async function fetchVrcNetworkStatsLite(): Promise<VrcNetworkStats> {
  const call = rpcCall("vrc");

  try {
    const [blockchainInfo, miningInfo] = await Promise.all([
      call("getblockchaininfo").catch(() => null),
      call("getmininginfo").catch(() => null),
    ]);

    const blockchain = blockchainInfo as {
      blocks?: unknown;
      difficulty?: unknown;
      totalsupply?: unknown;
    } | null;

    const blocks = parseRpcNumber(blockchain?.blocks);
    let difficulty = parseRpcNumber(blockchain?.difficulty);
    const rpcSupply = parseRpcNumber(blockchain?.totalsupply);

    const miningMetrics = parseVrcMiningInfo(miningInfo);
    if (difficulty == null) {
      difficulty = miningMetrics.difficulty;
    }

    const supply =
      rpcSupply != null && rpcSupply > 0
        ? rpcSupply
        : blocks != null
          ? await fetchIndexedSupply("vrc", blocks)
          : null;

    let percentStaked: number | null = null;
    const netStakeWeight = miningMetrics.netStakeWeight;
    if (netStakeWeight != null && supply != null && supply > 0) {
      percentStaked = (netStakeWeight / supply) * 100;
    }

    return {
      difficulty,
      blocks,
      supply,
      maxSupply: getMaxSupply("vrc"),
      interestRatePercent: miningMetrics.interestRatePercent,
      netStakeWeight,
      percentStaked,
      expectedStakeTimeSeconds: miningMetrics.expectedStakeTimeSeconds,
    };
  } catch {
    return {
      difficulty: null,
      blocks: null,
      supply: null,
      maxSupply: getMaxSupply("vrc"),
      interestRatePercent: null,
      netStakeWeight: null,
      percentStaked: null,
      expectedStakeTimeSeconds: null,
    };
  }
}
