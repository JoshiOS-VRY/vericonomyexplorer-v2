import { resolveNetworkHashPerSec, VRM_BLOCKS_7_DAYS, VRM_BLOCKS_PER_DAY, } from "@vericonomy/network-metrics";
import { parseRpcNumber } from "./stats.js";
async function safeNetworkHashrate(rpcCall, blockCount) {
    try {
        const hashrate = await rpcCall("getnetworkhashps", [blockCount], 15_000);
        if (typeof hashrate === "number" && hashrate > 0) {
            return hashrate;
        }
    }
    catch {
        /* unsupported or timeout */
    }
    return null;
}
/** Canonical live VRM network hashrate (shared resolver). */
export async function fetchCanonicalVrmHashrate(call, options = {}) {
    const include7d = options.include7d ?? false;
    const miningInfoPromise = options.miningInfo !== undefined
        ? Promise.resolve(options.miningInfo)
        : call("getmininginfo").catch(() => null);
    const blockchainInfoPromise = options.blockchainInfo !== undefined
        ? Promise.resolve(options.blockchainInfo)
        : call("getblockchaininfo").catch(() => null);
    const [miningInfoResult, hashrate1dResult, blockchainInfoResult, hashrate7dResult] = await Promise.allSettled([
        miningInfoPromise,
        safeNetworkHashrate(call, VRM_BLOCKS_PER_DAY),
        blockchainInfoPromise,
        include7d ? safeNetworkHashrate(call, VRM_BLOCKS_7_DAYS) : Promise.resolve(null),
    ]);
    const miningInfo = miningInfoResult.status === "fulfilled"
        ? miningInfoResult.value
        : null;
    const hashrate1d = hashrate1dResult.status === "fulfilled" ? hashrate1dResult.value : null;
    const hashrate7d = hashrate7dResult.status === "fulfilled" ? hashrate7dResult.value : null;
    const difficulty = blockchainInfoResult.status === "fulfilled"
        ? parseRpcNumber(blockchainInfoResult.value?.difficulty)
        : null;
    return resolveNetworkHashPerSec({
        miningInfo,
        hashrate1d,
        hashrate7d: include7d ? hashrate7d : null,
        difficulty,
    });
}
