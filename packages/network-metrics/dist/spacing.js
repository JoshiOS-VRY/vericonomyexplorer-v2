import { VRM_BLOCKS_PER_HOUR_MIN, VRM_POW_SPACING_MIN_SEC, VRM_POW_WORK_FACTOR, } from "./constants.js";
/** Mean inter-block spacing from two header timestamps over `blockCount` blocks. */
export function meanBlockSpacingSec(startTimeSec, endTimeSec, blockCount) {
    if (blockCount <= 0)
        return null;
    const span = endTimeSec - startTimeSec;
    if (!Number.isFinite(span) || span <= 0)
        return null;
    return Math.max(VRM_POW_SPACING_MIN_SEC, span / blockCount);
}
/** Observed spacing from getmininginfo blocks-per-hour (last 3600s on veriumd). */
export function blocksPerHourToSpacingSec(blocksPerHour) {
    if (!Number.isFinite(blocksPerHour) || blocksPerHour < VRM_BLOCKS_PER_HOUR_MIN) {
        return null;
    }
    return Math.max(VRM_POW_SPACING_MIN_SEC, 3600 / blocksPerHour);
}
/** Verium-native difficulty + spacing → H/s (matches GetPoWKHashPM without the ×60 kH/m step). */
export function difficultySpacingToHashPerSec(difficulty, spacingSec) {
    if (!Number.isFinite(difficulty) || difficulty <= 0)
        return null;
    if (!Number.isFinite(spacingSec) || spacingSec <= 0)
        return null;
    const hashPerSec = (difficulty * VRM_POW_WORK_FACTOR) / spacingSec;
    return hashPerSec > 0 ? hashPerSec : null;
}
export { VRM_POW_WORK_FACTOR };
