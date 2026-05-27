import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
import { getDb } from "./db.js";
import { getTip } from "../live/brokers.js";
import { runIndexerQuery } from "../db/queryPool.js";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const indexerSummary = require(`${repoRoot}/app/indexerV2/summary.js`);
const sharedDb = () => ({ db: getDb() });
function sharedWithTip(chainId, extra = {}) {
    const tip = getTip(chainId);
    return {
        db: getDb(),
        tip: tip ? { height: tip.height, hash: tip.hash } : undefined,
        ...extra,
    };
}
export async function fetchChainSummary(chainId, options = {}) {
    return indexerSummary.getChainSummary(chainId, sharedWithTip(chainId, options));
}
export async function fetchLandingData() {
    const [vrmSummary, vrcSummary, vrmRichlist, vrcRichlist, vrmLeaderboard] = await Promise.all([
        fetchChainSummary("vrm", { skipLiveBlocks: true }),
        fetchChainSummary("vrc", { skipLiveBlocks: true }),
        fetchRichlist("vrm", { limit: 5 }),
        fetchRichlist("vrc", { limit: 5 }),
        fetchLeaderboard("vrm", { period: "month", sort: "activity", limit: 5 }),
    ]);
    return { vrmSummary, vrcSummary, vrmRichlist, vrcRichlist, vrmLeaderboard };
}
export async function fetchVrmDashboard() {
    const since30d = Math.floor(Date.now() / 1000) - 30 * 86_400;
    const [summary, richlist, leaderboard, activityHistory] = await Promise.all([
        fetchChainSummary("vrm", { skipLiveBlocks: true }),
        fetchRichlist("vrm", { limit: 5 }),
        fetchLeaderboard("vrm", { period: "month", sort: "activity", limit: 5 }),
        fetchChainActivityHistory("vrm", { since: since30d, maxPoints: 100 }),
    ]);
    return { summary, richlist, leaderboard, activityHistory };
}
export function fetchChainActivityHistory(chainId, options = {}) {
    return runIndexerQuery("getChainActivityHistory", [chainId], options);
}
export async function fetchIndexerHealth() {
    return indexerSummary.getIndexerHealth(sharedDb());
}
export function fetchRichlist(chainId, options = {}) {
    return runIndexerQuery("getRichlist", [chainId], options);
}
export function fetchLeaderboard(chainId, options = {}) {
    return runIndexerQuery("getLeaderboard", [chainId], options);
}
export function fetchAddress(chainId, address, options = {}) {
    return runIndexerQuery("getAddress", [chainId, address], options);
}
export function fetchAddressBalanceHistory(chainId, address, options = {}) {
    return runIndexerQuery("getAddressBalanceHistory", [chainId, address], options);
}
export function fetchAddressUtxos(chainId, address, options = {}) {
    return runIndexerQuery("getAddressUtxos", [chainId, address], options);
}
export function fetchTransaction(chainId, txid) {
    return runIndexerQuery("getTransaction", [chainId, txid], {});
}
export async function fetchBlock(chainId, hashOrHeight, options = {}) {
    return indexerSummary.getBlock(chainId, hashOrHeight, { ...sharedDb(), ...options });
}
export function fetchChainHealth(chainId) {
    return runIndexerQuery("getChainHealth", [chainId], {});
}
