import { runIndexerQuery } from "../db/queryPool.js";
import { rpc } from "../rpc/index.js";
import { fetchOnChainSupply, fetchVrmHashrate, getMaxSupply, getTargetBlockTimeSeconds, hashPerSecToKhPerMin, parseRpcNumber, parseVrcMiningInfo, } from "./stats.js";
function rpcCall(chainId) {
    const client = rpc(chainId);
    return (method, params = [], timeoutMs) => client.call(method, params, timeoutMs);
}
function parseLegacyInterestRate(interestRate) {
    if (typeof interestRate === "number" && Number.isFinite(interestRate)) {
        return interestRate;
    }
    if (interestRate && typeof interestRate === "object") {
        const rate = interestRate.interest ??
            interestRate.rate;
        if (typeof rate === "number" && Number.isFinite(rate)) {
            return rate;
        }
    }
    return null;
}
function parseLegacyStakingInfo(stakingInfo) {
    const staking = stakingInfo;
    return {
        netStakeWeight: typeof staking?.netstakeweight === "number" ? staking.netstakeweight : null,
        expectedStakeTimeSeconds: typeof staking?.expectedtime === "number" ? staking.expectedtime : null,
    };
}
async function fetchIndexedTipHeight(chainId) {
    try {
        const summary = (await runIndexerQuery("getChainSummaryLiteIndexed", [chainId], {
            skipLiveBlocks: true,
            skipLiveRpc: true,
            limit: 1,
        }));
        return summary?.latestBlocks?.[0]?.height ?? null;
    }
    catch {
        return null;
    }
}
async function fetchIndexedSupply(chainId, height) {
    try {
        const result = (await runIndexerQuery("getIndexedSupplyAtHeight", [chainId], {
            height,
        }));
        const supply = result?.supply;
        return typeof supply === "number" && Number.isFinite(supply) && supply > 0
            ? supply
            : null;
    }
    catch {
        return null;
    }
}
async function resolveVrmSupply(call, blocks, blockchainInfo) {
    if (blocks == null) {
        return null;
    }
    const rpcSupply = await fetchOnChainSupply("vrm", call, blocks, blockchainInfo);
    if (rpcSupply != null && rpcSupply > 0) {
        return rpcSupply;
    }
    // Coinbase mint sum from the indexer — accurate when RPC UTXO set is unavailable.
    // Do not use estimatedSupplyAtHeight for VRM: Verium PoWT rewards are not approximated
    // by the placeholder blockRewardFunction and would skew supply (~275K vs ~3.7M).
    return fetchIndexedSupply("vrm", blocks);
}
async function fetchIndexedHashrate7dKhPerMin(chainId) {
    try {
        const result = (await runIndexerQuery("getIndexedHashrate7dAvg", [chainId], {}));
        const value = result?.hashrate7dKhPerMin;
        return typeof value === "number" && Number.isFinite(value) && value > 0
            ? value
            : null;
    }
    catch {
        return null;
    }
}
function difficultyToHashrateKhPerMin(difficulty, chainId = "vrm") {
    if (!Number.isFinite(difficulty) || difficulty <= 0) {
        return null;
    }
    const targetBlockTimeSeconds = getTargetBlockTimeSeconds(chainId);
    const hashPerSec = (difficulty * 2 ** 32) / targetBlockTimeSeconds;
    return hashPerSec > 0 ? hashPerSecToKhPerMin(hashPerSec) : null;
}
async function resolveVrmHashrates(call, difficulty) {
    const hashrates = await fetchVrmHashrate(call, "vrm");
    let hashrateKhPerMin = hashrates.currentHashPerSec != null
        ? hashPerSecToKhPerMin(hashrates.currentHashPerSec)
        : null;
    let hashrate7dKhPerMin = hashrates.hashrate7dHashPerSec != null
        ? hashPerSecToKhPerMin(hashrates.hashrate7dHashPerSec)
        : null;
    // Verium does not support getnetworkhashps — derive 7d avg from indexed block difficulty.
    if (hashrate7dKhPerMin == null) {
        hashrate7dKhPerMin = await fetchIndexedHashrate7dKhPerMin("vrm");
    }
    if (hashrateKhPerMin == null && difficulty != null) {
        hashrateKhPerMin = difficultyToHashrateKhPerMin(difficulty, "vrm");
    }
    if (hashrate7dKhPerMin == null && hashrateKhPerMin != null) {
        hashrate7dKhPerMin = hashrateKhPerMin;
    }
    return { hashrateKhPerMin, hashrate7dKhPerMin };
}
export async function fetchVrmNetworkStats() {
    const call = rpcCall("vrm");
    try {
        const blockchainInfo = (await call("getblockchaininfo").catch(() => null));
        let blocks = parseRpcNumber(blockchainInfo?.blocks);
        const difficulty = parseRpcNumber(blockchainInfo?.difficulty);
        if (blocks == null) {
            blocks = await fetchIndexedTipHeight("vrm");
        }
        const [hashrates, supply] = await Promise.all([
            resolveVrmHashrates(call, difficulty),
            resolveVrmSupply(call, blocks, blockchainInfo),
        ]);
        return {
            hashrateKhPerMin: hashrates.hashrateKhPerMin,
            hashrate7dKhPerMin: hashrates.hashrate7dKhPerMin,
            difficulty,
            blocks,
            supply,
            maxSupply: getMaxSupply("vrm"),
        };
    }
    catch {
        const blocks = await fetchIndexedTipHeight("vrm");
        const [supply, hashrates] = await Promise.all([
            blocks != null ? fetchIndexedSupply("vrm", blocks) : null,
            fetchIndexedHashrate7dKhPerMin("vrm"),
        ]);
        return {
            hashrateKhPerMin: null,
            hashrate7dKhPerMin: hashrates,
            difficulty: null,
            blocks,
            supply,
            maxSupply: getMaxSupply("vrm"),
        };
    }
}
export async function fetchVrcNetworkStats() {
    const call = rpcCall("vrc");
    try {
        const blockchainInfo = (await call("getblockchaininfo").catch(() => null));
        const blocks = parseRpcNumber(blockchainInfo?.blocks);
        let difficulty = parseRpcNumber(blockchainInfo?.difficulty);
        const [supply, miningInfo] = await Promise.all([
            blocks != null
                ? fetchOnChainSupply("vrc", call, blocks, blockchainInfo)
                : Promise.resolve(null),
            call("getmininginfo").catch(() => null),
        ]);
        const miningMetrics = parseVrcMiningInfo(miningInfo);
        if (difficulty == null) {
            difficulty = miningMetrics.difficulty;
        }
        let interestRatePercent = miningMetrics.interestRatePercent;
        let netStakeWeight = miningMetrics.netStakeWeight;
        let expectedStakeTimeSeconds = miningMetrics.expectedStakeTimeSeconds;
        if (interestRatePercent == null ||
            netStakeWeight == null ||
            expectedStakeTimeSeconds == null) {
            const [stakingInfo, interestRate] = await Promise.all([
                netStakeWeight == null || expectedStakeTimeSeconds == null
                    ? call("getstakinginfo").catch(() => null)
                    : Promise.resolve(null),
                interestRatePercent == null
                    ? call("getinterestrate")
                        .catch(() => call("getinterest").catch(() => null))
                    : Promise.resolve(null),
            ]);
            if (interestRatePercent == null) {
                interestRatePercent = parseLegacyInterestRate(interestRate);
            }
            if (netStakeWeight == null || expectedStakeTimeSeconds == null) {
                const legacyStaking = parseLegacyStakingInfo(stakingInfo);
                if (netStakeWeight == null) {
                    netStakeWeight = legacyStaking.netStakeWeight;
                }
                if (expectedStakeTimeSeconds == null) {
                    expectedStakeTimeSeconds = legacyStaking.expectedStakeTimeSeconds;
                }
            }
        }
        let percentStaked = null;
        if (netStakeWeight != null && supply != null && supply > 0) {
            percentStaked = (netStakeWeight / supply) * 100;
        }
        return {
            difficulty,
            blocks,
            supply,
            maxSupply: getMaxSupply("vrc"),
            interestRatePercent,
            netStakeWeight,
            percentStaked,
            expectedStakeTimeSeconds,
        };
    }
    catch {
        return {
            difficulty: null,
            blocks: null,
            supply: null,
            maxSupply: getMaxSupply("vrc"),
            interestRatePercent: null,
            netStakeWeight: null,
            percentStaked: null,
            expectedStakeTimeSeconds: null,
        };
    }
}
