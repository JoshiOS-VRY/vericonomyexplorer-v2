import { difficultyToHashPerSec } from "./convert.js";
import { VRM_TARGET_BLOCK_TIME_SEC } from "./constants.js";

export type HashrateSource =
  | "networkhashps"
  | "nethashrate"
  | "getnetworkhashps"
  | "difficulty"
  | "none";

export type MiningInfoLike = {
  networkhashps?: number | null;
  nethashrate?: number | null;
};

export type ResolveNetworkHashrateInput = {
  miningInfo?: MiningInfoLike | null;
  hashrate1d?: number | null;
  hashrate7d?: number | null;
  difficulty?: number | null;
  targetBlockTimeSec?: number;
};

export type ResolvedNetworkHashrate = {
  hashPerSec: number | null;
  hashrateKhPerMin: number | null;
  source: HashrateSource;
};

/** Normalize getmininginfo hashrate fields to H/s. */
export function normalizeMiningInfoHashrate(
  miningInfo?: MiningInfoLike | null,
): { hashPerSec: number | null; source: HashrateSource } {
  const networkhashps = miningInfo?.networkhashps;
  if (typeof networkhashps === "number" && networkhashps > 0) {
    return { hashPerSec: networkhashps, source: "networkhashps" };
  }

  const nethashrate = miningInfo?.nethashrate;
  if (typeof nethashrate === "number" && nethashrate > 0) {
    return { hashPerSec: (nethashrate * 1000) / 60, source: "nethashrate" };
  }

  return { hashPerSec: null, source: "none" };
}

/** Canonical fallback chain for live Verium network hashrate. */
export function resolveNetworkHashPerSec(
  input: ResolveNetworkHashrateInput,
): ResolvedNetworkHashrate {
  const targetBlockTimeSec = input.targetBlockTimeSec ?? VRM_TARGET_BLOCK_TIME_SEC;

  const fromMining = normalizeMiningInfoHashrate(input.miningInfo);
  if (fromMining.hashPerSec != null && fromMining.hashPerSec > 0) {
    return toResolved(fromMining.hashPerSec, fromMining.source);
  }

  if (typeof input.hashrate1d === "number" && input.hashrate1d > 0) {
    return toResolved(input.hashrate1d, "getnetworkhashps");
  }

  if (input.difficulty != null) {
    const fromDifficulty = difficultyToHashPerSec(input.difficulty, targetBlockTimeSec);
    if (fromDifficulty != null && fromDifficulty > 0) {
      return toResolved(fromDifficulty, "difficulty");
    }
  }

  if (typeof input.hashrate7d === "number" && input.hashrate7d > 0) {
    return toResolved(input.hashrate7d, "getnetworkhashps");
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
