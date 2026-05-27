export const CHAIN_IDS = ["vrm", "vrc"];
export function parseChainId(value) {
    const normalized = value.toLowerCase();
    if (normalized === "vrm" || normalized === "vrc") {
        return normalized;
    }
    return null;
}
