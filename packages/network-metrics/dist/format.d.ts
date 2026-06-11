/**
 * Format network hashrate (kH/min) for display across Vericonomy sites.
 * Escalates to MH/m at ≥1000 kH/m.
 */
export declare function formatNetworkHashrateKhPerMin(khPerMin: number | null | undefined): string;
/** Format H/s as network kH/m label (converts then formats). */
export declare function formatNetworkHashrateFromHps(hashPerSec: number | null | undefined): string;
//# sourceMappingURL=format.d.ts.map