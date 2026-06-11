import { VRM_TARGET_BLOCK_TIME_SEC } from "./constants.js";

/** H/s → kH/min (Verium ecosystem display unit). */
export function hashPerSecToKhPerMin(hashPerSec: number): number {
  return (hashPerSec * 60) / 1000;
}

/** kH/min → H/s. */
export function khPerMinToHashPerSec(khPerMin: number): number {
  return khPerMin * (1000 / 60);
}

/** Difficulty → H/s using Verium target block time. */
export function difficultyToHashPerSec(
  difficulty: number,
  targetBlockTimeSec = VRM_TARGET_BLOCK_TIME_SEC,
): number | null {
  if (!Number.isFinite(difficulty) || difficulty <= 0) return null;
  const hashPerSec = (difficulty * 2 ** 32) / targetBlockTimeSec;
  return hashPerSec > 0 ? hashPerSec : null;
}

/** Difficulty → kH/min. */
export function difficultyToKhPerMin(
  difficulty: number,
  targetBlockTimeSec = VRM_TARGET_BLOCK_TIME_SEC,
): number | null {
  const hps = difficultyToHashPerSec(difficulty, targetBlockTimeSec);
  return hps != null ? hashPerSecToKhPerMin(hps) : null;
}
