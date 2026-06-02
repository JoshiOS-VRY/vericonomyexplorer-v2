import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
import type { ChainId } from "../types.js";

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const veriumCoin = require(`${repoRoot}/app/coins/verium.js`);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vericoinCoin = require(`${repoRoot}/app/coins/vericoin.js`);

const Decimal = require("decimal.js");

const COINS: Record<ChainId, typeof veriumCoin> = {
  vrm: veriumCoin,
  vrc: vericoinCoin,
};

const NETWORK = "main";

export type RpcCall = (
  method: string,
  params?: unknown[],
  timeoutMs?: number,
) => Promise<unknown>;

export function parseRpcNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function supplyFromBlockchainInfo(blockchainInfo: unknown): number | null {
  if (!blockchainInfo || typeof blockchainInfo !== "object") {
    return null;
  }

  const supply = parseRpcNumber((blockchainInfo as Record<string, unknown>).totalsupply);
  return supply != null && supply > 0 ? supply : null;
}

export function parseVrcMiningInfo(miningInfo: unknown): {
  interestRatePercent: number | null;
  netStakeWeight: number | null;
  expectedStakeTimeSeconds: number | null;
  difficulty: number | null;
} {
  if (!miningInfo || typeof miningInfo !== "object") {
    return {
      interestRatePercent: null,
      netStakeWeight: null,
      expectedStakeTimeSeconds: null,
      difficulty: null,
    };
  }

  const info = miningInfo as Record<string, unknown>;
  const interestRatePercent = parseRpcNumber(info.stakeinterest);
  const netStakeWeight =
    parseRpcNumber(info.netstakeweight) ?? parseRpcNumber(info.networkstakeweight);

  let difficulty: number | null = null;
  const difficultyValue = info.difficulty;
  if (difficultyValue && typeof difficultyValue === "object") {
    const difficultyObj = difficultyValue as Record<string, unknown>;
    difficulty =
      parseRpcNumber(difficultyObj["proof-of-work"]) ??
      parseRpcNumber(difficultyObj["proof-of-stake"]);
  } else {
    difficulty = parseRpcNumber(difficultyValue);
  }

  let expectedStakeTimeSeconds: number | null = null;
  const walletWeight =
    info.stakeweight && typeof info.stakeweight === "object"
      ? parseRpcNumber((info.stakeweight as Record<string, unknown>).combined)
      : null;

  if (
    walletWeight != null &&
    walletWeight > 0 &&
    netStakeWeight != null &&
    netStakeWeight > 0
  ) {
    expectedStakeTimeSeconds = Math.round(
      (netStakeWeight / walletWeight) * getTargetBlockTimeSeconds("vrc"),
    );
  }

  return {
    interestRatePercent,
    netStakeWeight,
    expectedStakeTimeSeconds,
    difficulty,
  };
}

function utxoSetTimeoutMs(chainId: ChainId): number {
  if (chainId === "vrc") {
    return Number(process.env.VCEXP_VRC_UTXO_SET_TIMEOUT_MS ?? 15_000);
  }

  return Number(process.env.VCEXP_UTXO_SET_TIMEOUT_MS ?? 15_000);
}

export async function fetchOnChainSupply(
  chainId: ChainId,
  rpcCall: RpcCall,
  blocks: number,
  blockchainInfo?: unknown,
): Promise<number | null> {
  const fromChain = supplyFromBlockchainInfo(blockchainInfo);
  if (fromChain != null) {
    return fromChain;
  }

  try {
    const utxo = await rpcCall("gettxoutsetinfo", [], utxoSetTimeoutMs(chainId));
    if (utxo && typeof utxo === "object" && "total_amount" in utxo) {
      const supply = parseRpcNumber(
        (utxo as { total_amount?: number | string }).total_amount,
      );
      if (supply != null && supply > 0) {
        return supply;
      }
    }
  } catch {
    /* fall through */
  }

  if (chainId === "vrm") {
    try {
      const utxo = await rpcCall(
        "gettxoutsetinfo",
        ["muhash"],
        utxoSetTimeoutMs(chainId),
      );
      if (utxo && typeof utxo === "object" && "total_amount" in utxo) {
        const supply = parseRpcNumber(
          (utxo as { total_amount?: number | string }).total_amount,
        );
        if (supply != null && supply > 0) {
          return supply;
        }
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}

export function getMaxSupply(chainId: ChainId): number | null {
  const coin = COINS[chainId];
  const max = coin.maxSupplyByNetwork?.[NETWORK];
  if (!max) return null;
  const value = Number(max.toString());
  return Number.isFinite(value) ? value : null;
}

export function estimatedSupplyAtHeight(
  chainId: ChainId,
  height: number,
): number | null {
  return estimatedSupply(chainId, height);
}

function estimatedSupply(chainId: ChainId, height: number): number | null {
  const coin = COINS[chainId];
  const checkpoint = coin.utxoSetCheckpointsByNetwork?.[NETWORK];

  let checkpointHeight = 0;
  let checkpointSupply = new Decimal(50);

  if (checkpoint && checkpoint.height <= height) {
    checkpointHeight = checkpoint.height;
    checkpointSupply = new Decimal(checkpoint.total_amount);
  }

  const halvingBlockInterval = coin.halvingBlockIntervalsByNetwork?.[NETWORK] ?? 210000;
  let supply = checkpointSupply;
  let i = checkpointHeight;

  while (i < height) {
    const nextHalvingHeight =
      halvingBlockInterval * Math.floor(i / halvingBlockInterval) + halvingBlockInterval;

    if (height < nextHalvingHeight) {
      const heightDiff = height - i;
      const reward = coin.blockRewardFunction(i, NETWORK);
      return Number(supply.plus(new Decimal(heightDiff).times(reward)).toString());
    }

    const heightDiff = nextHalvingHeight - i;
    const reward = coin.blockRewardFunction(i, NETWORK);
    supply = supply.plus(new Decimal(heightDiff).times(reward));
    i += heightDiff;
  }

  return Number(supply.toString());
}

export function getTargetBlockTimeSeconds(chainId: ChainId): number {
  return COINS[chainId].targetBlockTimeSeconds ?? 600;
}

export function hashPerSecToKhPerMin(hashPerSec: number): number {
  return (hashPerSec * 60) / 1000;
}

/** Matches wallet `resolveBlockTimeMinutes`: observed rate first, then RPC target. */
export function resolveVrmBlockTimeMinutes(
  blocksPerHour: number | null,
  blockTimeMinTarget: number | null,
): number | null {
  if (blocksPerHour != null && blocksPerHour > 0) {
    return 60 / blocksPerHour;
  }

  if (blockTimeMinTarget != null && blockTimeMinTarget > 0) {
    return blockTimeMinTarget;
  }

  return null;
}

export async function fetchVrmHashrate(
  rpcCall: RpcCall,
  chainId: ChainId = "vrm",
): Promise<{
  currentHashPerSec: number | null;
  hashrate7dHashPerSec: number | null;
  blocksPerHour: number | null;
  blockTimeMinTarget: number | null;
}> {
  const targetBlockTimeSeconds = getTargetBlockTimeSeconds(chainId);
  const blocksPerDay = Math.floor((24 * 60 * 60) / targetBlockTimeSeconds);
  const blocks7Days = blocksPerDay * 7;
  const blocks1Day = blocksPerDay;

  const [miningInfoResult, hashrate7dResult, hashrate1dResult, blockchainInfoResult] =
    await Promise.allSettled([
      rpcCall("getmininginfo"),
      safeNetworkHashrate(rpcCall, blocks7Days),
      safeNetworkHashrate(rpcCall, blocks1Day),
      rpcCall("getblockchaininfo"),
    ]);

  let currentHashPerSec: number | null = null;
  let hashrate7dHashPerSec: number | null = null;
  let blocksPerHour: number | null = null;
  let blockTimeMinTarget: number | null = null;

  if (miningInfoResult.status === "fulfilled") {
    const miningInfo = miningInfoResult.value as {
      networkhashps?: number;
      blocksperhour?: unknown;
      blocktime?: unknown;
    };
    if (miningInfo?.networkhashps && miningInfo.networkhashps > 0) {
      currentHashPerSec = miningInfo.networkhashps;
    }
    blocksPerHour = parseRpcNumber(miningInfo?.blocksperhour);
    blockTimeMinTarget = parseRpcNumber(miningInfo?.blocktime);
  }

  if (hashrate7dResult.status === "fulfilled") {
    hashrate7dHashPerSec = hashrate7dResult.value;
  }

  if ((!currentHashPerSec || currentHashPerSec <= 0) && hashrate1dResult.status === "fulfilled") {
    currentHashPerSec = hashrate1dResult.value;
  }

  if ((!currentHashPerSec || currentHashPerSec <= 0) && blockchainInfoResult.status === "fulfilled") {
    const blockchainInfo = blockchainInfoResult.value as { difficulty?: number };
    if (blockchainInfo?.difficulty) {
      const difficulty = Number(blockchainInfo.difficulty);
      const calculated = (difficulty * 2 ** 32) / targetBlockTimeSeconds;
      if (calculated > 0) currentHashPerSec = calculated;
    }
  }

  if ((!currentHashPerSec || currentHashPerSec <= 0) && hashrate7dHashPerSec && hashrate7dHashPerSec > 0) {
    currentHashPerSec = hashrate7dHashPerSec;
  }

  if (
    (hashrate7dHashPerSec == null || hashrate7dHashPerSec <= 0) &&
    currentHashPerSec != null &&
    currentHashPerSec > 0
  ) {
    hashrate7dHashPerSec = currentHashPerSec;
  }

  return {
    currentHashPerSec,
    hashrate7dHashPerSec,
    blocksPerHour,
    blockTimeMinTarget,
  };
}

async function safeNetworkHashrate(
  rpcCall: RpcCall,
  blockCount: number,
): Promise<number | null> {
  try {
    const hashrate = await rpcCall("getnetworkhashps", [blockCount], 15_000);
    if (typeof hashrate === "number" && hashrate > 0) {
      return hashrate;
    }
  } catch {
    /* method may not exist on Verium */
  }
  return null;
}
