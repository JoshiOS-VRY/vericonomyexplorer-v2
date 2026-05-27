import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
import { getDb } from "./db.js";
import { getTip } from "../live/brokers.js";
import { runIndexerQuery } from "../db/queryPool.js";
import type { ChainId } from "../types.js";

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const indexerSummary = require(`${repoRoot}/app/indexerV2/summary.js`);

const sharedDb = () => ({ db: getDb() });

function sharedWithTip(chainId: string, extra: Record<string, unknown> = {}) {
  const tip = getTip(chainId as ChainId);
  return {
    db: getDb(),
    tip: tip ? { height: tip.height, hash: tip.hash } : undefined,
    ...extra,
  };
}

export async function fetchChainSummary(chainId: string, options: Record<string, unknown> = {}) {
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

export function fetchChainActivityHistory(
  chainId: string,
  options: { maxPoints?: number; since?: number } = {},
) {
  return runIndexerQuery("getChainActivityHistory", [chainId], options);
}

export async function fetchIndexerHealth() {
  return indexerSummary.getIndexerHealth(sharedDb());
}

export function fetchRichlist(
  chainId: string,
  options: { limit?: number; offset?: number } = {},
) {
  return runIndexerQuery("getRichlist", [chainId], options);
}

export function fetchLeaderboard(
  chainId: string,
  options: {
    period?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  return runIndexerQuery("getLeaderboard", [chainId], options);
}

export function fetchAddress(
  chainId: string,
  address: string,
  options: { limit?: number; offset?: number } = {},
) {
  return runIndexerQuery("getAddress", [chainId, address], options);
}

export function fetchAddressBalanceHistory(
  chainId: string,
  address: string,
  options: { maxPoints?: number; since?: number } = {},
) {
  return runIndexerQuery("getAddressBalanceHistory", [chainId, address], options);
}

export function fetchAddressUtxos(
  chainId: string,
  address: string,
  options: { limit?: number; offset?: number } = {},
) {
  return runIndexerQuery("getAddressUtxos", [chainId, address], options);
}

export function fetchTransaction(chainId: string, txid: string) {
  return runIndexerQuery("getTransaction", [chainId, txid], {});
}

export async function fetchBlock(
  chainId: string,
  hashOrHeight: string,
  options: { limit?: number; offset?: number } = {},
) {
  return indexerSummary.getBlock(chainId, hashOrHeight, { ...sharedDb(), ...options });
}

export function fetchChainHealth(chainId: string) {
  return runIndexerQuery("getChainHealth", [chainId], {});
}
