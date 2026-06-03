import { runIndexerQuery } from "../db/queryPool.js";
import { rpc } from "../rpc/index.js";
import type { ChainId } from "../types.js";
import type { VrcNetworkStats, VrmNetworkStats } from "../types/home.js";
import {
  fetchOnChainSupply,
  fetchVrmHashrate,
  getMaxSupply,
  getTargetBlockTimeSeconds,
  hashPerSecToKhPerMin,
  parseRpcNumber,
  parseVrcMiningInfo,
  resolveVrmBlockTimeMinutes,
  supplyFromBlockchainInfo,
  type RpcCall,
} from "./stats.js";

function rpcCall(chainId: ChainId): RpcCall {
  const client = rpc(chainId);
  return (method, params = [], timeoutMs) => client.call(method, params, timeoutMs);
}

function parseLegacyInterestRate(interestRate: unknown): number | null {
  if (typeof interestRate === "number" && Number.isFinite(interestRate)) {
    return interestRate;
  }

  if (interestRate && typeof interestRate === "object") {
    const rate =
      (interestRate as { interest?: number; rate?: number }).interest ??
      (interestRate as { rate?: number }).rate;
    if (typeof rate === "number" && Number.isFinite(rate)) {
      return rate;
    }
  }

  return null;
}

function parseLegacyStakingInfo(stakingInfo: unknown): {
  netStakeWeight: number | null;
  expectedStakeTimeSeconds: number | null;
} {
  const staking = stakingInfo as {
    netstakeweight?: number;
    expectedtime?: number;
  } | null;

  return {
    netStakeWeight:
      typeof staking?.netstakeweight === "number" ? staking.netstakeweight : null,
    expectedStakeTimeSeconds:
      typeof staking?.expectedtime === "number" ? staking.expectedtime : null,
  };
}

async function fetchIndexedTipHeight(chainId: ChainId): Promise<number | null> {
  try {
    const summary = (await runIndexerQuery("getChainSummaryLiteIndexed", [chainId], {
      skipLiveBlocks: true,
      skipLiveRpc: true,
      limit: 1,
    })) as { latestBlocks?: { height: number }[] };

    return summary?.latestBlocks?.[0]?.height ?? null;
  } catch {
    return null;
  }
}

async function fetchIndexedSupply(
  chainId: ChainId,
  height: number,
): Promise<number | null> {
  try {
    const result = (await runIndexerQuery("getIndexedSupplyAtHeight", [chainId], {
      height,
    })) as { supply?: number | null };

    const supply = result?.supply;
    return typeof supply === "number" && Number.isFinite(supply) && supply > 0
      ? supply
      : null;
  } catch {
    return null;
  }
}

async function resolveVrmSupply(
  call: RpcCall,
  blocks: number | null,
  blockchainInfo: unknown,
): Promise<number | null> {
  if (blocks == null) {
    return null;
  }

  const rpcSupply = await fetchOnChainSupply("vrm", call, blocks, blockchainInfo);
  if (rpcSupply != null && rpcSupply > 0) {
    return rpcSupply;
  }

  // Coinbase mint sum from the indexer — accurate when RPC UTXO set is unavailable.
  // Do not use estimatedSupplyAtHeight for VRM: Verium PoWT rewards are not approximated
  // by the placeholder blockRewardFunction and would skew supply (~275K vs ~3.7M).
  return fetchIndexedSupply("vrm", blocks);
}

async function resolveVrcSupply(
  call: RpcCall,
  blocks: number | null,
  blockchainInfo: unknown,
): Promise<number | null> {
  if (blocks == null) {
    return null;
  }

  const fromChain = supplyFromBlockchainInfo(blockchainInfo);
  if (fromChain != null && fromChain > 0) {
    return fromChain;
  }

  const rpcSupply = await fetchOnChainSupply("vrc", call, blocks, blockchainInfo);
  if (rpcSupply != null && rpcSupply > 0) {
    return rpcSupply;
  }

  return fetchIndexedSupply("vrc", blocks);
}

function difficultyToHashrateKhPerMin(
  difficulty: number,
  chainId: ChainId = "vrm",
): number | null {
  if (!Number.isFinite(difficulty) || difficulty <= 0) {
    return null;
  }

  const targetBlockTimeSeconds = getTargetBlockTimeSeconds(chainId);
  const hashPerSec = (difficulty * 2 ** 32) / targetBlockTimeSeconds;
  return hashPerSec > 0 ? hashPerSecToKhPerMin(hashPerSec) : null;
}

async function resolveVrmNetworkMetrics(
  call: RpcCall,
  difficulty: number | null,
): Promise<{
  hashrateKhPerMin: number | null;
  avgBlockTimeMin: number | null;
  blocksPerHour: number | null;
}> {
  const hashrates = await fetchVrmHashrate(call, "vrm");

  let hashrateKhPerMin =
    hashrates.currentHashPerSec != null
      ? hashPerSecToKhPerMin(hashrates.currentHashPerSec)
      : null;

  if (hashrateKhPerMin == null && difficulty != null) {
    hashrateKhPerMin = difficultyToHashrateKhPerMin(difficulty, "vrm");
  }

  const avgBlockTimeMin = resolveVrmBlockTimeMinutes(
    hashrates.blocksPerHour,
    hashrates.blockTimeMinTarget,
  );

  return {
    hashrateKhPerMin,
    avgBlockTimeMin,
    blocksPerHour: hashrates.blocksPerHour,
  };
}

export async function fetchVrmNetworkStats(): Promise<VrmNetworkStats> {
  const call = rpcCall("vrm");

  try {
    const blockchainInfo = (await call("getblockchaininfo").catch(() => null)) as {
      blocks?: unknown;
      difficulty?: unknown;
      totalsupply?: unknown;
    } | null;

    let blocks = parseRpcNumber(blockchainInfo?.blocks);
    const difficulty = parseRpcNumber(blockchainInfo?.difficulty);

    if (blocks == null) {
      blocks = await fetchIndexedTipHeight("vrm");
    }

    const [metrics, supply] = await Promise.all([
      resolveVrmNetworkMetrics(call, difficulty),
      resolveVrmSupply(call, blocks, blockchainInfo),
    ]);

    return {
      hashrateKhPerMin: metrics.hashrateKhPerMin,
      avgBlockTimeMin: metrics.avgBlockTimeMin,
      blocksPerHour: metrics.blocksPerHour,
      difficulty,
      blocks,
      supply,
      maxSupply: getMaxSupply("vrm"),
    };
  } catch {
    const blocks = await fetchIndexedTipHeight("vrm");
    const supply =
      blocks != null ? await fetchIndexedSupply("vrm", blocks) : null;

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

export async function fetchVrcNetworkStats(): Promise<VrcNetworkStats> {
  const call = rpcCall("vrc");

  try {
    const blockchainInfo = (await call("getblockchaininfo").catch(() => null)) as {
      blocks?: unknown;
      difficulty?: unknown;
      totalsupply?: unknown;
    } | null;

    const blocks = parseRpcNumber(blockchainInfo?.blocks);
    let difficulty = parseRpcNumber(blockchainInfo?.difficulty);

    const [supply, miningInfo] = await Promise.all([
      resolveVrcSupply(call, blocks, blockchainInfo),
      call("getmininginfo").catch(() => null),
    ]);

    const miningMetrics = parseVrcMiningInfo(miningInfo);
    if (difficulty == null) {
      difficulty = miningMetrics.difficulty;
    }

    let interestRatePercent = miningMetrics.interestRatePercent;
    let netStakeWeight = miningMetrics.netStakeWeight;
    let expectedStakeTimeSeconds = miningMetrics.expectedStakeTimeSeconds;

    if (
      interestRatePercent == null ||
      netStakeWeight == null ||
      expectedStakeTimeSeconds == null
    ) {
      const [stakingInfo, interestRate] = await Promise.all([
        netStakeWeight == null || expectedStakeTimeSeconds == null
          ? call("getstakinginfo").catch(() => null)
          : Promise.resolve(null),
        interestRatePercent == null
          ? call("getinterestrate")
              .catch(() => call("getinterest").catch(() => null))
          : Promise.resolve(null),
      ]);

      if (interestRatePercent == null) {
        interestRatePercent = parseLegacyInterestRate(interestRate);
      }

      if (netStakeWeight == null || expectedStakeTimeSeconds == null) {
        const legacyStaking = parseLegacyStakingInfo(stakingInfo);
        if (netStakeWeight == null) {
          netStakeWeight = legacyStaking.netStakeWeight;
        }
        if (expectedStakeTimeSeconds == null) {
          expectedStakeTimeSeconds = legacyStaking.expectedStakeTimeSeconds;
        }
      }
    }

    let percentStaked: number | null = null;
    if (netStakeWeight != null && supply != null && supply > 0) {
      percentStaked = (netStakeWeight / supply) * 100;
    }

    return {
      difficulty,
      blocks,
      supply,
      maxSupply: getMaxSupply("vrc"),
      interestRatePercent,
      netStakeWeight,
      percentStaked,
      expectedStakeTimeSeconds,
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
