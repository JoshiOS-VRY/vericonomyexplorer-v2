import { rpc } from "../rpc/index.js";
import type { ChainId } from "../types.js";
import type { VrcNetworkStats, VrmNetworkStats } from "../types/home.js";
import {
  fetchOnChainSupply,
  fetchVrmHashrate,
  getMaxSupply,
  hashPerSecToKhPerMin,
  parseRpcNumber,
  parseVrcMiningInfo,
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

export async function fetchVrmNetworkStats(): Promise<VrmNetworkStats> {
  const call = rpcCall("vrm");

  try {
    const blockchainInfo = (await call("getblockchaininfo").catch(() => null)) as {
      blocks?: unknown;
      difficulty?: unknown;
      totalsupply?: unknown;
    } | null;

    const blocks = parseRpcNumber(blockchainInfo?.blocks);
    const difficulty = parseRpcNumber(blockchainInfo?.difficulty);

    const [hashrates, supply] = await Promise.all([
      fetchVrmHashrate(call, "vrm"),
      blocks != null
        ? fetchOnChainSupply("vrm", call, blocks, blockchainInfo)
        : Promise.resolve(null),
    ]);

    return {
      hashrateKhPerMin:
        hashrates.currentHashPerSec != null
          ? hashPerSecToKhPerMin(hashrates.currentHashPerSec)
          : null,
      hashrate7dKhPerMin:
        hashrates.hashrate7dHashPerSec != null
          ? hashPerSecToKhPerMin(hashrates.hashrate7dHashPerSec)
          : null,
      difficulty,
      blocks,
      supply,
      maxSupply: getMaxSupply("vrm"),
    };
  } catch {
    return {
      hashrateKhPerMin: null,
      hashrate7dKhPerMin: null,
      difficulty: null,
      blocks: null,
      supply: null,
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
    } | null;

    const blocks = parseRpcNumber(blockchainInfo?.blocks);
    let difficulty = parseRpcNumber(blockchainInfo?.difficulty);

    const [supply, miningInfo] = await Promise.all([
      blocks != null
        ? fetchOnChainSupply("vrc", call, blocks, blockchainInfo)
        : Promise.resolve(null),
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
