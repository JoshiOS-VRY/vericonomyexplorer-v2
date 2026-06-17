import { VRM_POW_WORK_FACTOR } from "./constants.js";
/** Mean inter-block spacing from two header timestamps over `blockCount` blocks. */
export declare function meanBlockSpacingSec(startTimeSec: number, endTimeSec: number, blockCount: number): number | null;
/** Observed spacing from getmininginfo blocks-per-hour (last 3600s on veriumd). */
export declare function blocksPerHourToSpacingSec(blocksPerHour: number): number | null;
/** Verium-native difficulty + spacing → H/s (matches GetPoWKHashPM without the ×60 kH/m step). */
export declare function difficultySpacingToHashPerSec(difficulty: number, spacingSec: number): number | null;
export { VRM_POW_WORK_FACTOR };
//# sourceMappingURL=spacing.d.ts.map