import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const veriumCoin = require(`${repoRoot}/app/coins/verium.js`);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vericoinCoin = require(`${repoRoot}/app/coins/vericoin.js`);
const Decimal = require("decimal.js");
const COINS = {
    vrm: veriumCoin,
    vrc: vericoinCoin,
};
const NETWORK = "main";
export async function fetchOnChainSupply(chainId, rpcCall, blocks) {
    try {
        const utxo = await Promise.race([
            rpcCall("gettxoutsetinfo"),
            new Promise((resolve) => setTimeout(() => resolve(null), 8_000)),
        ]);
        if (utxo && typeof utxo === "object" && "total_amount" in utxo) {
            const supply = Number(utxo.total_amount);
            if (Number.isFinite(supply))
                return supply;
        }
    }
    catch {
        /* fall through */
    }
    if (chainId === "vrc") {
        return null;
    }
    try {
        return estimatedSupply(chainId, blocks);
    }
    catch {
        return null;
    }
}
export function getMaxSupply(chainId) {
    const coin = COINS[chainId];
    const max = coin.maxSupplyByNetwork?.[NETWORK];
    if (!max)
        return null;
    const value = Number(max.toString());
    return Number.isFinite(value) ? value : null;
}
function estimatedSupply(chainId, height) {
    const coin = COINS[chainId];
    const checkpoint = coin.utxoSetCheckpointsByNetwork?.[NETWORK];
    let checkpointHeight = 0;
    let checkpointSupply = new Decimal(50);
    if (checkpoint && checkpoint.height <= height) {
        checkpointHeight = checkpoint.height;
        checkpointSupply = new Decimal(checkpoint.total_amount);
    }
    const halvingBlockInterval = coin.halvingBlockIntervalsByNetwork?.[NETWORK] ?? 210000;
    let supply = checkpointSupply;
    let i = checkpointHeight;
    while (i < height) {
        const nextHalvingHeight = halvingBlockInterval * Math.floor(i / halvingBlockInterval) + halvingBlockInterval;
        if (height < nextHalvingHeight) {
            const heightDiff = height - i;
            const reward = coin.blockRewardFunction(i, NETWORK);
            return Number(supply.plus(new Decimal(heightDiff).times(reward)).toString());
        }
        const heightDiff = nextHalvingHeight - i;
        const reward = coin.blockRewardFunction(i, NETWORK);
        supply = supply.plus(new Decimal(heightDiff).times(reward));
        i += heightDiff;
    }
    return Number(supply.toString());
}
export function getTargetBlockTimeSeconds(chainId) {
    return COINS[chainId].targetBlockTimeSeconds ?? 600;
}
export function hashPerSecToKhPerMin(hashPerSec) {
    return (hashPerSec * 60) / 1000;
}
export async function fetchVrmHashrate(rpcCall, chainId = "vrm") {
    const targetBlockTimeSeconds = getTargetBlockTimeSeconds(chainId);
    const blocksPerDay = Math.floor((24 * 60 * 60) / targetBlockTimeSeconds);
    const blocks7Days = blocksPerDay * 7;
    const blocks1Day = blocksPerDay;
    const [miningInfoResult, hashrate7dResult, hashrate1dResult, blockchainInfoResult] = await Promise.allSettled([
        rpcCall("getmininginfo"),
        safeNetworkHashrate(rpcCall, blocks7Days),
        safeNetworkHashrate(rpcCall, blocks1Day),
        rpcCall("getblockchaininfo"),
    ]);
    let currentHashPerSec = null;
    let hashrate7dHashPerSec = null;
    if (miningInfoResult.status === "fulfilled") {
        const miningInfo = miningInfoResult.value;
        if (miningInfo?.networkhashps && miningInfo.networkhashps > 0) {
            currentHashPerSec = miningInfo.networkhashps;
        }
    }
    if (hashrate7dResult.status === "fulfilled") {
        hashrate7dHashPerSec = hashrate7dResult.value;
    }
    if ((!currentHashPerSec || currentHashPerSec <= 0) && hashrate1dResult.status === "fulfilled") {
        currentHashPerSec = hashrate1dResult.value;
    }
    if ((!currentHashPerSec || currentHashPerSec <= 0) && blockchainInfoResult.status === "fulfilled") {
        const blockchainInfo = blockchainInfoResult.value;
        if (blockchainInfo?.difficulty) {
            const difficulty = Number(blockchainInfo.difficulty);
            const calculated = (difficulty * 2 ** 32) / targetBlockTimeSeconds;
            if (calculated > 0)
                currentHashPerSec = calculated;
        }
    }
    if ((!currentHashPerSec || currentHashPerSec <= 0) && hashrate7dHashPerSec && hashrate7dHashPerSec > 0) {
        currentHashPerSec = hashrate7dHashPerSec;
    }
    return { currentHashPerSec, hashrate7dHashPerSec };
}
async function safeNetworkHashrate(rpcCall, blockCount) {
    try {
        const hashrate = (await Promise.race([
            rpcCall("getnetworkhashps", [blockCount]),
            new Promise((resolve) => setTimeout(() => resolve(null), 8_000)),
        ]));
        if (typeof hashrate === "number" && hashrate > 0)
            return hashrate;
    }
    catch {
        /* method may not exist on Verium */
    }
    return null;
}
