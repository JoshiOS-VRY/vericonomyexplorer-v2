import { runIndexerQuery, txLookupTimeoutMs } from "../db/queryPool.js";
import { getTip } from "../live/brokers.js";
import { enrichChainSummary, enrichLatestBlocksLive, enrichIndexerHealth, fetchBlockWithRpcFallback, fetchTransactionWithRpcFallback, fetchAddressWithRpcFallback, } from "./liveEnrichment.js";
const summaryQueryOptions = {
    skipBlockEnrichment: true,
};
/** Indexed-first enrichment; live RPC/block merge is handled by tip refresh + client polling. */
const defaultSummaryEnrichOptions = {
    skipLiveBlocks: true,
    skipLiveRpc: true,
};
export async function fetchChainSummary(chainId, options = {}) {
    const queryOptions = { ...summaryQueryOptions, ...options };
    const enrichOptions = { ...defaultSummaryEnrichOptions, ...options };
    const summary = (await runIndexerQuery("getChainSummaryIndexed", [chainId], queryOptions));
    return enrichChainSummary(summary, chainId, enrichOptions);
}
export async function fetchChainSummaryLite(chainId, options = {}) {
    const queryOptions = { ...summaryQueryOptions, ...options };
    const enrichOptions = { ...defaultSummaryEnrichOptions, ...options };
    const summary = (await runIndexerQuery("getChainSummaryLiteIndexed", [chainId], queryOptions));
    return enrichChainSummary(summary, chainId, enrichOptions);
}
export async function fetchLatestBlocks(chainId, options = {}) {
    const queryOptions = { ...summaryQueryOptions, ...options };
    const indexed = (await runIndexerQuery("getLatestBlocksIndexed", [chainId], queryOptions));
    return enrichLatestBlocksLive(indexed.latestBlocks, chainId, indexed.health, queryOptions);
}
export async function fetchBlocksPage(chainId, options = {}) {
    const queryOptions = { skipBlockEnrichment: false, ...options };
    const indexed = (await runIndexerQuery("getBlocksPageIndexed", [chainId], queryOptions));
    const items = await enrichLatestBlocksLive(indexed.items, chainId, indexed.health, { ...queryOptions, skipLiveBlocks: true });
    return {
        ...indexed,
        items,
    };
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
export function fetchMinedLeaderboard(chainId, options = {}) {
    return runIndexerQuery("getMinedLeaderboard", [chainId], options);
}
export function fetchAddressBalanceHistory(chainId, address, options = {}) {
    return runIndexerQuery("getAddressBalanceHistory", [chainId, address], options);
}
export function fetchAddressUtxos(chainId, address, options = {}) {
    return runIndexerQuery("getAddressUtxos", [chainId, address], options);
}
export async function fetchTransaction(chainId, txid, queryOptions = {}) {
    const indexed = (await runIndexerQuery("getTransaction", [chainId, txid], {}, {
        ...queryOptions,
        timeoutMs: queryOptions.timeoutMs ?? txLookupTimeoutMs,
        priority: queryOptions.priority ?? 0,
    }));
    return fetchTransactionWithRpcFallback(chainId, txid, indexed, queryOptions);
}
export function fetchTransactionRelatedAddresses(chainId, txid, options = {}) {
    return runIndexerQuery("getTransactionRelatedAddresses", [chainId, txid], options, {
        timeoutMs: txLookupTimeoutMs,
        priority: 0,
    });
}
export async function fetchAddress(chainId, address, options = {}, queryOptions = {}) {
    const indexed = (await runIndexerQuery("getAddress", [chainId, address], options, queryOptions));
    return fetchAddressWithRpcFallback(chainId, address, indexed, {
        ...options,
        ...queryOptions,
    });
}
export async function fetchBlock(chainId, hashOrHeight, options = {}) {
    const indexed = (await runIndexerQuery("getBlockIndexed", [chainId, hashOrHeight], {
        skipAddressCount: true,
        ...options,
    }, { priority: 0 }));
    return fetchBlockWithRpcFallback(chainId, hashOrHeight, indexed, options);
}
export function fetchChainHealth(chainId) {
    return runIndexerQuery("getChainHealth", [chainId], { fullHealth: true });
}
export function getCachedTip(chainId) {
    const tip = getTip(chainId);
    return tip ? { height: tip.height, hash: tip.hash } : undefined;
}
