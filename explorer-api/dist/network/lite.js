import { runIndexerQuery } from '../db/queryPool.js';
import { rpc } from '../rpc/index.js';
import { fetchCanonicalVrmHashrate } from './hashrateLive.js';
import { getMaxSupply, parseRpcNumber, parseVrcMiningInfo } from './stats.js';
const HOT_RPC_TIMEOUT_MS = Number(process.env.VCEXP_HOT_RPC_TIMEOUT_MS ?? 4_000);
const HOT_INDEXER_TIMEOUT_MS = Number(process.env.VCEXP_HOT_INDEXER_TIMEOUT_MS ?? 3_000);
function rpcCall(chainId) {
    const client = rpc(chainId);
    return (method, params = [], timeoutMs = HOT_RPC_TIMEOUT_MS) => client.call(method, params, timeoutMs);
}
async function fetchIndexedTipHeight(chainId) {
    try {
        const summary = (await runIndexerQuery('getChainSummaryLiteIndexed', [chainId], { skipLiveBlocks: true, skipLiveRpc: true, limit: 1 }, { timeoutMs: HOT_INDEXER_TIMEOUT_MS, priority: 0 }));
        return summary?.latestBlocks?.[0]?.height ?? null;
    }
    catch {
        return null;
    }
}
async function fetchIndexedSupply(chainId, height) {
    try {
        const result = (await runIndexerQuery('getIndexedSupplyAtHeight', [chainId], { height }, { timeoutMs: HOT_INDEXER_TIMEOUT_MS, priority: 0 }));
        const supply = result?.supply;
        return typeof supply === 'number' && Number.isFinite(supply) && supply > 0 ? supply : null;
    }
    catch {
        return null;
    }
}
function mapHashrateSource(source) {
    if (source === 'recent_blocks' ||
        source === 'blocks_per_hour' ||
        source === 'recent_blocks_extended' ||
        source === 'networkhashps' ||
        source === 'nethashrate' ||
        source === 'difficulty') {
        return source;
    }
    return null;
}
/** Lightweight network stats for hot paths (home, SSR). Uses canonical hashrate resolver. */
export async function fetchVrmNetworkStatsLite() {
    const call = rpcCall('vrm');
    try {
        const [blockchainInfo, miningInfo] = await Promise.all([
            call('getblockchaininfo').catch(() => null),
            call('getmininginfo').catch(() => null),
        ]);
        const hashrateResolved = await fetchCanonicalVrmHashrate(call, {
            miningInfo,
            blockchainInfo,
        });
        const blockchain = blockchainInfo;
        const mining = miningInfo;
        let blocks = parseRpcNumber(blockchain?.blocks);
        const difficulty = parseRpcNumber(blockchain?.difficulty);
        if (blocks == null) {
            blocks = await fetchIndexedTipHeight('vrm');
        }
        const rpcSupply = parseRpcNumber(blockchain?.totalsupply);
        const supply = rpcSupply != null && rpcSupply > 0
            ? rpcSupply
            : blocks != null
                ? await fetchIndexedSupply('vrm', blocks)
                : null;
        const blocksPerHour = parseRpcNumber(mining?.blocksperhour);
        const blockTimeMinTarget = parseRpcNumber(mining?.blocktime);
        const avgBlockTimeMin = blocksPerHour != null && blocksPerHour > 0
            ? 60 / blocksPerHour
            : blockTimeMinTarget != null && blockTimeMinTarget > 0
                ? blockTimeMinTarget
                : null;
        return {
            hashrateKhPerMin: hashrateResolved.hashrateKhPerMin,
            hashrateSource: mapHashrateSource(hashrateResolved.source),
            avgBlockTimeMin,
            blocksPerHour,
            difficulty,
            blocks,
            supply,
            maxSupply: getMaxSupply('vrm'),
        };
    }
    catch {
        const blocks = await fetchIndexedTipHeight('vrm');
        const supply = blocks != null ? await fetchIndexedSupply('vrm', blocks) : null;
        return {
            hashrateKhPerMin: null,
            hashrateSource: null,
            avgBlockTimeMin: null,
            blocksPerHour: null,
            difficulty: null,
            blocks,
            supply,
            maxSupply: getMaxSupply('vrm'),
        };
    }
}
/** Lightweight VRC network stats for hot paths. Skips gettxoutsetinfo and legacy staking fallbacks. */
export async function fetchVrcNetworkStatsLite() {
    const call = rpcCall('vrc');
    try {
        const [blockchainInfo, miningInfo] = await Promise.all([
            call('getblockchaininfo').catch(() => null),
            call('getmininginfo').catch(() => null),
        ]);
        const blockchain = blockchainInfo;
        const blocks = parseRpcNumber(blockchain?.blocks);
        let difficulty = parseRpcNumber(blockchain?.difficulty);
        const rpcSupply = parseRpcNumber(blockchain?.totalsupply);
        const miningMetrics = parseVrcMiningInfo(miningInfo);
        if (difficulty == null) {
            difficulty = miningMetrics.difficulty;
        }
        const supply = rpcSupply != null && rpcSupply > 0
            ? rpcSupply
            : blocks != null
                ? await fetchIndexedSupply('vrc', blocks)
                : null;
        let percentStaked = null;
        const netStakeWeight = miningMetrics.netStakeWeight;
        if (netStakeWeight != null && supply != null && supply > 0) {
            percentStaked = (netStakeWeight / supply) * 100;
        }
        return {
            difficulty,
            blocks,
            supply,
            maxSupply: getMaxSupply('vrc'),
            interestRatePercent: miningMetrics.interestRatePercent,
            netStakeWeight,
            percentStaked,
            expectedStakeTimeSeconds: miningMetrics.expectedStakeTimeSeconds,
        };
    }
    catch {
        return {
            difficulty: null,
            blocks: null,
            supply: null,
            maxSupply: getMaxSupply('vrc'),
            interestRatePercent: null,
            netStakeWeight: null,
            percentStaked: null,
            expectedStakeTimeSeconds: null,
        };
    }
}
