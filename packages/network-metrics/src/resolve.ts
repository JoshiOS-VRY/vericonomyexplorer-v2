import { difficultyToHashPerSec } from "./convert.js";
import { VRM_TARGET_BLOCK_TIME_SEC } from "./constants.js";
import {
  blocksPerHourToSpacingSec,
  difficultySpacingToHashPerSec,
} from "./spacing.js";

export type HashrateSource =
  | "recent_blocks"
  | "blocks_per_hour"
  | "recent_blocks_extended"
  | "networkhashps"
  | "nethashrate"
  | "difficulty"
  | "none";

export type MiningInfoLike = {
  networkhashps?: number | null;
  nethashrate?: number | null;
  blocksperhour?: number | null;
  /** Legacy RPC key: "nethashrate (kH/m)" */
  [key: string]: unknown;
};

export type ResolveNetworkHashrateInput = {
  miningInfo?: MiningInfoLike | null;
  difficulty?: number | null;
  /** Mean spacing over VRM_HASHRATE_WINDOW_BLOCKS (~30 min). */
  recentSpacingSec?: number | null;
  /** Mean spacing over VRM_POW_INTERVAL (72 blocks). */
  extendedSpacingSec?: number | null;
  blocksPerHour?: number | null;
  targetBlockTimeSec?: number;
};

export type ResolvedNetworkHashrate = {
  hashPerSec: number | null;
  hashrateKhPerMin: number | null;
  source: HashrateSource;
};

function readNethashrateKhPerMin(miningInfo?: MiningInfoLike | null): number | null {
  const direct = miningInfo?.nethashrate;
  if (typeof direct === "number" && direct > 0) return direct;

  const legacy = miningInfo?.["nethashrate (kH/m)"];
  if (typeof legacy === "number" && legacy > 0) return legacy;

  return null;
}

/** Normalize getmininginfo hashrate fields to H/s. */
export function normalizeMiningInfoHashrate(
  miningInfo?: MiningInfoLike | null,
): { hashPerSec: number | null; source: HashrateSource } {
  const networkhashps = miningInfo?.networkhashps;
  if (typeof networkhashps === "number" && networkhashps > 0) {
    return { hashPerSec: networkhashps, source: "networkhashps" };
  }

  const nethashrate = readNethashrateKhPerMin(miningInfo);
  if (nethashrate != null) {
    return { hashPerSec: (nethashrate * 1000) / 60, source: "nethashrate" };
  }

  return { hashPerSec: null, source: "none" };
}

/**
 * Canonical live Verium network hashrate.
 * Prefers measured recent block spacing (Verium scrypt² formula) over the
 * laggy full-chain EMA in veriumd networkhashps.
 */
export function resolveNetworkHashPerSec(
  input: ResolveNetworkHashrateInput,
): ResolvedNetworkHashrate {
  const targetBlockTimeSec = input.targetBlockTimeSec ?? VRM_TARGET_BLOCK_TIME_SEC;
  const difficulty = input.difficulty;

  if (difficulty != null && input.recentSpacingSec != null) {
    const hashPerSec = difficultySpacingToHashPerSec(difficulty, input.recentSpacingSec);
    if (hashPerSec != null) {
      return toResolved(hashPerSec, "recent_blocks");
    }
  }

  if (difficulty != null && input.blocksPerHour != null) {
    const spacing = blocksPerHourToSpacingSec(input.blocksPerHour);
    if (spacing != null) {
      const hashPerSec = difficultySpacingToHashPerSec(difficulty, spacing);
      if (hashPerSec != null) {
        return toResolved(hashPerSec, "blocks_per_hour");
      }
    }
  }

  if (difficulty != null && input.extendedSpacingSec != null) {
    const hashPerSec = difficultySpacingToHashPerSec(difficulty, input.extendedSpacingSec);
    if (hashPerSec != null) {
      return toResolved(hashPerSec, "recent_blocks_extended");
    }
  }

  const fromMining = normalizeMiningInfoHashrate(input.miningInfo);
  if (fromMining.hashPerSec != null && fromMining.hashPerSec > 0) {
    return toResolved(fromMining.hashPerSec, fromMining.source);
  }

  if (difficulty != null) {
    const fromDifficulty = difficultyToHashPerSec(difficulty, targetBlockTimeSec);
    if (fromDifficulty != null && fromDifficulty > 0) {
      return toResolved(fromDifficulty, "difficulty");
    }
  }

  return { hashPerSec: null, hashrateKhPerMin: null, source: "none" };
}

function toResolved(hashPerSec: number, source: HashrateSource): ResolvedNetworkHashrate {
  return {
    hashPerSec,
    hashrateKhPerMin: (hashPerSec * 60) / 1000,
    source,
  };
}
