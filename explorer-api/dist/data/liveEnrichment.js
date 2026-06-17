import { createRequire } from 'node:module';
import { runIndexerQuery } from '../db/queryPool.js';
import { repoRoot, getSummaryLiveBlockLimit } from '../env.js';
import { getTip } from '../live/brokers.js';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const health = require(`${repoRoot}/app/indexerV2/health.js`);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const liveChain = require(`${repoRoot}/app/indexerV2/liveChain.js`);
const offlineStatus = {
    label: 'Offline',
    message: 'Unable to reach the chain node.',
    syncing: false,
};
function getLatestBlockHeight(latestBlocks) {
    if (!Array.isArray(latestBlocks) || latestBlocks.length === 0) {
        return null;
    }
    const height = latestBlocks[0].height;
    return height == null || Number.isNaN(Number(height)) ? null : Number(height);
}
function topBlockNeedsRpcEnrichment(blocks) {
    const top = blocks[0];
    if (!top || top.height == null) {
        return false;
    }
    const difficulty = top.difficulty;
    return (top.size == null ||
        difficulty == null ||
        difficulty === '' ||
        top.time == null ||
        !Number.isFinite(Number(top.time)));
}
function shouldFetchLiveBlocks(tip, _indexedHeight, latestBlockHeight, options, indexedBlocks = []) {
    if (options.skipLiveBlocks === true) {
        return false;
    }
    if (latestBlockHeight === null) {
        return true;
    }
    if (tip.height > latestBlockHeight) {
        return true;
    }
    return tip.height === latestBlockHeight && topBlockNeedsRpcEnrichment(indexedBlocks);
}
function computeLiveBlockCount(tipHeight, indexedHeight, latestBlockHeight, maxCount, indexedBlocks = []) {
    if (latestBlockHeight != null &&
        tipHeight === latestBlockHeight &&
        topBlockNeedsRpcEnrichment(indexedBlocks)) {
        return 1;
    }
    if (indexedHeight != null && tipHeight > indexedHeight) {
        return Math.min(maxCount, Math.max(1, tipHeight - indexedHeight + 1));
    }
    if (latestBlockHeight != null && tipHeight > latestBlockHeight) {
        return Math.min(maxCount, Math.max(1, tipHeight - latestBlockHeight + 1));
    }
    return maxCount;
}
function mergeLatestBlocksWithRpc(indexedBlocks, rpcBlocks, maxCount = 10) {
    const byHeight = new Map();
    for (const block of indexedBlocks) {
        if (block.height != null) {
            byHeight.set(Number(block.height), block);
        }
    }
    for (const block of rpcBlocks) {
        const height = Number(block.height);
        const indexed = byHeight.get(height);
        byHeight.set(height, indexed
            ? {
                ...indexed,
                ...block,
                time: block.time ?? indexed.time ?? null,
                txCount: block.txCount ?? indexed.txCount,
                size: block.size ?? indexed.size ?? null,
                difficulty: block.difficulty ?? indexed.difficulty ?? null,
                extractedBy: block.extractedBy ?? indexed.extractedBy ?? null,
                extractedByAddress: block.extractedByAddress ?? indexed.extractedByAddress ?? null,
                outputCount: block.outputCount ?? indexed.outputCount ?? null,
            }
            : block);
    }
    return [...byHeight.values()]
        .sort((a, b) => Number(b.height) - Number(a.height))
        .slice(0, maxCount);
}
async function resolveTip(chainId, options) {
    const skipLiveRpc = options.skipLiveRpc === true || options.skipLiveBlocks === true;
    const brokerTip = getTip(chainId);
    if (brokerTip) {
        return brokerTip;
    }
    if (skipLiveRpc) {
        return null;
    }
    return (await liveChain.getTip(chainId, options));
}
async function enrichVrcBlockInterestRates(blocks, chainId, options) {
    if (chainId !== 'vrc' || blocks.length === 0) {
        return blocks;
    }
    if (blocks.every((block) => block.interestRatePercent != null)) {
        return blocks;
    }
    try {
        return (await runIndexerQuery('enrichBlockInterestRatesIndexed', [chainId, blocks], options));
    }
    catch {
        return blocks;
    }
}
export async function enrichLatestBlocksLive(latestBlocks, chainId, summaryHealth, options = {}) {
    const indexedBlocks = Array.isArray(latestBlocks)
        ? latestBlocks.filter((block) => block != null && typeof block === 'object')
        : [];
    try {
        const tip = await resolveTip(chainId, options);
        if (!tip) {
            return enrichVrcBlockInterestRates(indexedBlocks, chainId, options);
        }
        const indexedHeight = summaryHealth?.heights?.maxIndexedHeight ?? null;
        const latestBlockHeight = getLatestBlockHeight(indexedBlocks);
        if (!shouldFetchLiveBlocks(tip, indexedHeight, latestBlockHeight, options, indexedBlocks)) {
            return enrichVrcBlockInterestRates(indexedBlocks, chainId, options);
        }
        const maxCount = getSummaryLiveBlockLimit();
        const count = computeLiveBlockCount(tip.height, indexedHeight, latestBlockHeight, maxCount, indexedBlocks);
        let fromHeight;
        if (indexedHeight != null && tip.height > indexedHeight) {
            fromHeight = indexedHeight + 1;
        }
        else if (latestBlockHeight != null &&
            tip.height >= latestBlockHeight &&
            topBlockNeedsRpcEnrichment(indexedBlocks)) {
            fromHeight = tip.height;
        }
        const rpcBlocks = (await liveChain.enrichBlockMiners(chainId, (await liveChain.getRecentBlocks(chainId, count, {
            ...options,
            tipHeight: tip.height,
            fromHeight,
            blockVerbosity: 1,
        })), options));
        const merged = mergeLatestBlocksWithRpc(indexedBlocks, rpcBlocks, maxCount);
        return enrichVrcBlockInterestRates(merged, chainId, options);
    }
    catch {
        return enrichVrcBlockInterestRates(indexedBlocks, chainId, options);
    }
}
export async function enrichChainSummary(summary, chainId, options = {}) {
    try {
        const tip = await resolveTip(chainId, options);
        if (tip) {
            summary.health = health.enrichWithLiveRpc(summary.health, tip.height, options);
        }
    }
    catch {
        /* keep indexed health when live tip lookup fails */
    }
    try {
        summary.latestBlocks = await enrichLatestBlocksLive(summary.latestBlocks, chainId, summary.health, options);
    }
    catch {
        /* block enrichment failure should not mark the chain offline */
    }
    return summary;
}
export async function enrichIndexerHealth(baseHealth, options = {}) {
    const chains = await Promise.all((baseHealth.chains ?? []).map(async (chainHealth) => {
        try {
            const chainId = chainHealth.id;
            const tip = await liveChain.getTip(chainId, options);
            return health.enrichWithLiveRpc(chainHealth, tip.height, options);
        }
        catch {
            return {
                ...chainHealth,
                explorerStatus: offlineStatus,
            };
        }
    }));
    return { ...baseHealth, chains };
}
export async function fetchBlockWithRpcFallback(chainId, hashOrHeight, indexed, options = {}) {
    if (indexed.found) {
        return indexed;
    }
    try {
        const rpc = (await liveChain.getBlockFromRpc(chainId, hashOrHeight, options));
        if (!rpc.found) {
            return rpc;
        }
        return rpc;
    }
    catch {
        return indexed;
    }
}
export async function fetchTransactionWithRpcFallback(chainId, txid, indexed, options = {}) {
    if (indexed.found) {
        return indexed;
    }
    try {
        const rpc = (await liveChain.getTransactionFromRpc(chainId, txid, options));
        return rpc.found ? rpc : indexed;
    }
    catch {
        return indexed;
    }
}
export async function fetchAddressWithRpcFallback(chainId, address, indexed, options = {}) {
    if (indexed.found) {
        return indexed;
    }
    try {
        const rpc = (await liveChain.getAddressFromRpc(chainId, address, options));
        return rpc.found ? rpc : indexed;
    }
    catch {
        return indexed;
    }
}
