/** H/s → kH/min (Verium ecosystem display unit). */
export declare function hashPerSecToKhPerMin(hashPerSec: number): number;
/** kH/min → H/s. */
export declare function khPerMinToHashPerSec(khPerMin: number): number;
/** Difficulty → H/s at a fixed target block time (static fallback). */
export declare function difficultyToHashPerSec(difficulty: number, targetBlockTimeSec?: number): number | null;
/** Difficulty → kH/min. */
export declare function difficultyToKhPerMin(difficulty: number, targetBlockTimeSec?: number): number | null;
//# sourceMappingURL=convert.d.ts.map