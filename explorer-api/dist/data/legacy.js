import { runIndexerQuery } from "../db/queryPool.js";
import { getTip } from "../live/brokers.js";
import { enrichChainSummary, enrichLatestBlocksLive, enrichIndexerHealth, fetchBlockWithRpcFallback, } from "./liveEnrichment.js";
const summaryQueryOptions = {
    skipBlockEnrichment: true,
};
export async function fetchChainSummary(chainId, options = {}) {
    const queryOptions = { ...summaryQueryOptions, ...options };
    const summary = (await runIndexerQuery("getChainSummaryIndexed", [chainId], queryOptions));
    return enrichChainSummary(summary, chainId, queryOptions);
}
export async function fetchLatestBlocks(chainId, options = {}) {
    const queryOptions = { ...summaryQueryOptions, ...options };
    const summary = (await runIndexerQuery("getChainSummaryIndexed", [chainId], queryOptions));
    return enrichLatestBlocksLive(summary.latestBlocks, chainId, summary.health, queryOptions);
}
export async function fetchLandingData() {
    const skipOpts = { skipLiveBlocks: true, skipLiveRpc: true };
    // Run indexed reads in parallel (one worker each) instead of one serial getLandingBundle call.
    const [vrmSummaryRaw, vrcSummaryRaw, vrmRichlist, vrcRichlist, vrmLeaderboard] = await Promise.all([
        runIndexerQuery("getChainSummaryIndexed", ["vrm"], skipOpts),
        runIndexerQuery("getChainSummaryIndexed", ["vrc"], skipOpts),
        runIndexerQuery("getRichlist", ["vrm"], { limit: 5 }),
        runIndexerQuery("getRichlist", ["vrc"], { limit: 5 }),
        runIndexerQuery("getLeaderboard", ["vrm"], {
            period: "month",
            sort: "activity",
            limit: 5,
        }),
    ]);
    const [vrmSummary, vrcSummary] = await Promise.all([
        enrichChainSummary(vrmSummaryRaw, "vrm", skipOpts),
        enrichChainSummary(vrcSummaryRaw, "vrc", skipOpts),
    ]);
    return {
        vrmSummary,
        vrcSummary,
        vrmRichlist,
        vrcRichlist,
        vrmLeaderboard,
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
export function fetchAddressBalanceHistory(chainId, address, options = {}) {
    return runIndexerQuery("getAddressBalanceHistory", [chainId, address], options);
}
export function fetchAddressUtxos(chainId, address, options = {}) {
    return runIndexerQuery("getAddressUtxos", [chainId, address], options);
}
export function fetchTransaction(chainId, txid, queryOptions = {}) {
    return runIndexerQuery("getTransaction", [chainId, txid], {}, queryOptions);
}
export function fetchAddress(chainId, address, options = {}, queryOptions = {}) {
    return runIndexerQuery("getAddress", [chainId, address], options, queryOptions);
}
export async function fetchBlock(chainId, hashOrHeight, options = {}) {
    const indexed = (await runIndexerQuery("getBlockIndexed", [chainId, hashOrHeight], options));
    return fetchBlockWithRpcFallback(chainId, hashOrHeight, indexed, options);
}
export function fetchChainHealth(chainId) {
    return runIndexerQuery("getChainHealth", [chainId], { fullHealth: true });
}
export function getCachedTip(chainId) {
    const tip = getTip(chainId);
    return tip ? { height: tip.height, hash: tip.hash } : undefined;
}
