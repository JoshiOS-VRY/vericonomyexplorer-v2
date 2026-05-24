import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
import { getDb } from "./db.js";
import { getTip } from "../live/brokers.js";
import type { ChainId } from "../types.js";

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const indexerQuery = require(`${repoRoot}/app/indexerV2/query.js`);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const indexerSummary = require(`${repoRoot}/app/indexerV2/summary.js`);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const indexerHealth = require(`${repoRoot}/app/indexerV2/health.js`);

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
    Promise.resolve(fetchRichlist("vrm", { limit: 5 })),
    Promise.resolve(fetchRichlist("vrc", { limit: 5 })),
    Promise.resolve(fetchLeaderboard("vrm", { period: "month", sort: "activity", limit: 5 })),
  ]);

  return { vrmSummary, vrcSummary, vrmRichlist, vrcRichlist, vrmLeaderboard };
}

export async function fetchVrmDashboard() {
  const [summary, richlist, leaderboard] = await Promise.all([
    fetchChainSummary("vrm", { skipLiveBlocks: true }),
    Promise.resolve(fetchRichlist("vrm", { limit: 5 })),
    Promise.resolve(fetchLeaderboard("vrm", { period: "month", sort: "activity", limit: 5 })),
  ]);

  return { summary, richlist, leaderboard };
}

export async function fetchIndexerHealth() {
  return indexerSummary.getIndexerHealth(sharedDb());
}

export function fetchRichlist(
  chainId: string,
  options: { limit?: number; offset?: number } = {},
) {
  return indexerQuery.getRichlist(chainId, { ...sharedDb(), ...options });
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
  return indexerQuery.getLeaderboard(chainId, { ...sharedDb(), ...options });
}

export function fetchAddress(
  chainId: string,
  address: string,
  options: { limit?: number; offset?: number } = {},
) {
  return indexerQuery.getAddress(chainId, address, { ...sharedDb(), ...options });
}

export function fetchTransaction(chainId: string, txid: string) {
  return indexerQuery.getTransaction(chainId, txid, sharedDb());
}

export async function fetchBlock(
  chainId: string,
  hashOrHeight: string,
  options: { limit?: number; offset?: number } = {},
) {
  return indexerSummary.getBlock(chainId, hashOrHeight, { ...sharedDb(), ...options });
}

export function fetchChainHealth(chainId: string) {
  return indexerHealth.getChainHealth(chainId, sharedDb());
}
