import { runIndexerQuery, txLookupTimeoutMs } from "../db/queryPool.js";
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
export async function fetchChainSummaryLite(chainId, options = {}) {
    const queryOptions = { ...summaryQueryOptions, ...options };
    const summary = (await runIndexerQuery("getChainSummaryLiteIndexed", [chainId], queryOptions));
    return enrichChainSummary(summary, chainId, queryOptions);
}
export async function fetchLatestBlocks(chainId, options = {}) {
    const queryOptions = { ...summaryQueryOptions, ...options };
    const indexed = (await runIndexerQuery("getLatestBlocksIndexed", [chainId], queryOptions));
    return enrichLatestBlocksLive(indexed.latestBlocks, chainId, indexed.health, queryOptions);
}
export async function fetchLandingData() {
    const skipOpts = { skipLiveBlocks: true, skipLiveRpc: true };
    const bundle = (await runIndexerQuery("getLandingBundle", [], skipOpts));
    const [vrmSummary, vrcSummary] = await Promise.all([
        enrichChainSummary(bundle.vrmSummary, "vrm", skipOpts),
        enrichChainSummary(bundle.vrcSummary, "vrc", skipOpts),
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
export async function fetchChainActivityHistory(chainId, options = {}) {
    const chainHealth = options.chainHealth ??
        (await runIndexerQuery("getChainHealth", [chainId], {}));
    return runIndexerQuery("getChainActivityHistory", [chainId], {
        ...options,
        chainHealth,
    });
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
    return runIndexerQuery("getTransaction", [chainId, txid], {}, {
        ...queryOptions,
        timeoutMs: queryOptions.timeoutMs ?? txLookupTimeoutMs,
        priority: queryOptions.priority ?? 0,
    });
}
export function fetchTransactionRelatedAddresses(chainId, txid, options = {}) {
    return runIndexerQuery("getTransactionRelatedAddresses", [chainId, txid], options, {
        timeoutMs: txLookupTimeoutMs,
        priority: 0,
    });
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
