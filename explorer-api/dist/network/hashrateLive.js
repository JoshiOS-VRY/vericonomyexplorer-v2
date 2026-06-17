import { resolveNetworkHashPerSec, } from '@vericonomy/network-metrics';
import { parseRpcNumber } from './stats.js';
import { fetchExtendedBlockSpacingSec, fetchRecentBlockSpacingSec } from './recentSpacing.js';
/** Canonical live VRM network hashrate (shared resolver). */
export async function fetchCanonicalVrmHashrate(call, options = {}) {
    const miningInfoPromise = options.miningInfo !== undefined
        ? Promise.resolve(options.miningInfo)
        : call('getmininginfo').catch(() => null);
    const blockchainInfoPromise = options.blockchainInfo !== undefined
        ? Promise.resolve(options.blockchainInfo)
        : call('getblockchaininfo').catch(() => null);
    const [miningInfoResult, blockchainInfoResult] = await Promise.allSettled([
        miningInfoPromise,
        blockchainInfoPromise,
    ]);
    const miningRaw = miningInfoResult.status === 'fulfilled'
        ? miningInfoResult.value
        : null;
    const blockchainInfo = blockchainInfoResult.status === 'fulfilled'
        ? blockchainInfoResult.value
        : null;
    const difficulty = parseRpcNumber(blockchainInfo?.difficulty);
    const tipHeight = parseRpcNumber(blockchainInfo?.blocks);
    const blocksPerHour = parseRpcNumber(miningRaw?.blocksperhour);
    const miningInfo = miningRaw
        ? {
            networkhashps: parseRpcNumber(miningRaw.networkhashps) ?? undefined,
            nethashrate: parseRpcNumber(miningRaw.nethashrate) ??
                parseRpcNumber(miningRaw['nethashrate (kH/m)']) ??
                undefined,
            blocksperhour: blocksPerHour ?? undefined,
            ...miningRaw,
        }
        : null;
    let recentSpacingSec = null;
    let extendedSpacingSec = null;
    if (tipHeight != null) {
        [recentSpacingSec, extendedSpacingSec] = await Promise.all([
            fetchRecentBlockSpacingSec(call, tipHeight),
            fetchExtendedBlockSpacingSec(call, tipHeight),
        ]);
    }
    return resolveNetworkHashPerSec({
        miningInfo,
        difficulty,
        recentSpacingSec,
        extendedSpacingSec,
        blocksPerHour,
    });
}
