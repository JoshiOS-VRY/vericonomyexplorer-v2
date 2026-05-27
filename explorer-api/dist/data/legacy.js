import { runIndexerQuery } from "../db/queryPool.js";
import { getTip } from "../live/brokers.js";
import { enrichChainSummary, enrichIndexerHealth, fetchBlockWithRpcFallback, } from "./liveEnrichment.js";
export async function fetchChainSummary(chainId, options = {}) {
    const summary = (await runIndexerQuery("getChainSummaryIndexed", [chainId], options));
    return enrichChainSummary(summary, chainId, options);
}
export async function fetchLandingData() {
    const bundle = (await runIndexerQuery("getLandingBundle", [], {}));
    const [vrmSummary, vrcSummary] = await Promise.all([
        enrichChainSummary(bundle.vrmSummary, "vrm", { skipLiveBlocks: true }),
        enrichChainSummary(bundle.vrcSummary, "vrc", { skipLiveBlocks: true }),
    ]);
    return {
        vrmSummary,
        vrcSummary,
        vrmRichlist: bundle.vrmRichlist,
        vrcRichlist: bundle.vrcRichlist,
        vrmLeaderboard: bundle.vrmLeaderboard,
    };
}
export async function fetchVrmDashboardIndexed() {
    return runIndexerQuery("getVrmDashboardBundle", [], {});
}
export function fetchChainActivityHistory(chainId, options = {}) {
    return runIndexerQuery("getChainActivityHistory", [chainId], options);
}
export async function fetchIndexerHealth() {
    const baseHealth = await runIndexerQuery("getIndexerHealthIndexed", [], {});
    return enrichIndexerHealth(baseHealth);
}
export function fetchRichlist(chainId, options = {}) {
    return runIndexerQuery("getRichlist", [chainId], options);
}
export function fetchLeaderboard(chainId, options = {}) {
    return runIndexerQuery("getLeaderboard", [chainId], options);
}
export function fetchAddress(chainId, address, options = {}) {
    return runIndexerQuery("getAddress", [chainId, address], options);
}
export function fetchAddressBalanceHistory(chainId, address, options = {}) {
    return runIndexerQuery("getAddressBalanceHistory", [chainId, address], options);
}
export function fetchAddressUtxos(chainId, address, options = {}) {
    return runIndexerQuery("getAddressUtxos", [chainId, address], options);
}
export function fetchTransaction(chainId, txid) {
    return runIndexerQuery("getTransaction", [chainId, txid], {}, { timeoutMs: 15_000 });
}
export async function fetchBlock(chainId, hashOrHeight, options = {}) {
    const indexed = (await runIndexerQuery("getBlockIndexed", [chainId, hashOrHeight], options));
    return fetchBlockWithRpcFallback(chainId, hashOrHeight, indexed, options);
}
export function fetchChainHealth(chainId) {
    return runIndexerQuery("getChainHealth", [chainId], {});
}
export function getCachedTip(chainId) {
    const tip = getTip(chainId);
    return tip ? { height: tip.height, hash: tip.hash } : undefined;
}
