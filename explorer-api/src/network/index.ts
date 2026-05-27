import { rpc } from "../rpc/index.js";
import type { ChainId } from "../types.js";
import type { VrcNetworkStats, VrmNetworkStats } from "../types/home.js";
import {
  fetchOnChainSupply,
  fetchVrmHashrate,
  getMaxSupply,
  hashPerSecToKhPerMin,
} from "./stats.js";

function rpcCall(chainId: ChainId) {
  const client = rpc(chainId);
  return (method: string, params: unknown[] = []) => client.call(method, params);
}

export async function fetchVrmNetworkStats(): Promise<VrmNetworkStats> {
  const call = rpcCall("vrm");

  try {
    const [blockchainInfo, hashrates, supply] = await Promise.all([
      call("getblockchaininfo").catch(() => null),
      fetchVrmHashrate(call, "vrm"),
      call("getblockchaininfo")
        .then((info) => {
          const blocks = (info as { blocks?: number })?.blocks;
          return typeof blocks === "number" ? fetchOnChainSupply("vrm", call, blocks) : null;
        })
        .catch(() => null),
    ]);

    const info = blockchainInfo as { blocks?: number; difficulty?: number } | null;
    const blocks = typeof info?.blocks === "number" ? info.blocks : null;
    const difficulty = typeof info?.difficulty === "number" ? info.difficulty : null;

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
      blocks?: number;
      difficulty?: number;
    } | null;

    const blocks = typeof blockchainInfo?.blocks === "number" ? blockchainInfo.blocks : null;
    const difficulty =
      typeof blockchainInfo?.difficulty === "number" ? blockchainInfo.difficulty : null;

    const [supply, stakingInfo, interestRate] = await Promise.all([
      blocks != null ? fetchOnChainSupply("vrc", call, blocks) : Promise.resolve(null),
      call("getstakinginfo").catch(() => null),
      call("getinterestrate").catch(() => call("getinterest").catch(() => null)),
    ]);

    const staking = stakingInfo as {
      netstakeweight?: number;
      weight?: number;
      expectedtime?: number;
    } | null;

    let interestRatePercent: number | null = null;
    if (typeof interestRate === "number" && Number.isFinite(interestRate)) {
      interestRatePercent = interestRate;
    } else if (interestRate && typeof interestRate === "object") {
      const rate = (interestRate as { interest?: number; rate?: number }).interest ??
        (interestRate as { rate?: number }).rate;
      if (typeof rate === "number" && Number.isFinite(rate)) {
        interestRatePercent = rate;
      }
    }

    const netStakeWeight =
      typeof staking?.netstakeweight === "number" ? staking.netstakeweight : null;
    const weight = typeof staking?.weight === "number" ? staking.weight : null;
    const expectedStakeTimeSeconds =
      typeof staking?.expectedtime === "number" ? staking.expectedtime : null;

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
