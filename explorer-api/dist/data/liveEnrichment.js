import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
import { getTip } from "../live/brokers.js";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const health = require(`${repoRoot}/app/indexerV2/health.js`);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const liveChain = require(`${repoRoot}/app/indexerV2/liveChain.js`);
const offlineStatus = {
    label: "Offline",
    message: "Unable to reach the chain node.",
    syncing: false,
};
export async function enrichChainSummary(summary, chainId, options = {}) {
    try {
        const tip = getTip(chainId) ??
            (await liveChain.getTip(chainId, options));
        summary.health = health.enrichWithLiveRpc(summary.health, tip.height, options);
        const indexedHeight = summary.health?.heights?.maxIndexedHeight ?? null;
        if (!options.skipLiveBlocks &&
            (indexedHeight === null || tip.height > indexedHeight)) {
            summary.latestBlocks = await liveChain.getRecentBlocks(chainId, 10, options);
        }
    }
    catch {
        summary.health = {
            ...summary.health,
            explorerStatus: offlineStatus,
        };
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
        return (await liveChain.getBlockFromRpc(chainId, hashOrHeight, options));
    }
    catch {
        return indexed;
    }
}
