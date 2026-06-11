const LOCALE = "en-US";
/**
 * Format network hashrate (kH/min) for display across Vericonomy sites.
 * Escalates to MH/m at ≥1000 kH/m.
 */
export function formatNetworkHashrateKhPerMin(khPerMin) {
    if (khPerMin == null || !Number.isFinite(khPerMin) || khPerMin <= 0) {
        return "—";
    }
    if (khPerMin >= 1000) {
        return `${(khPerMin / 1000).toLocaleString(LOCALE, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} MH/m`;
    }
    return `${khPerMin.toLocaleString(LOCALE, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} kH/m`;
}
/** Format H/s as network kH/m label (converts then formats). */
export function formatNetworkHashrateFromHps(hashPerSec) {
    if (hashPerSec == null || !Number.isFinite(hashPerSec) || hashPerSec <= 0) {
        return "—";
    }
    return formatNetworkHashrateKhPerMin((hashPerSec * 60) / 1000);
}
