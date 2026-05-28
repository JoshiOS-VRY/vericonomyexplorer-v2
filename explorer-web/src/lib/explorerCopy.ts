import type { SourceInfo } from "@/lib/api/types";

export function formatExplorerSourceLabel(source: SourceInfo): string | null {
  const label = source.label?.trim().toLowerCase();
  if (!label || label === "index" || label.includes("index")) {
    return null;
  }
  return source.label;
}

export const EXPLORER_DATA_INCOMPLETE = "Some data may be incomplete.";

const USER_MESSAGE_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /Historical network metrics need backfill\. Run npm run indexer:backfill-network-metrics\./gi,
    "Historical network metrics are still being collected.",
  ],
  [/No indexed blocks yet\./gi, "No blocks available yet."],
  [
    /No blocks have been indexed for this chain\./gi,
    "No blocks are available for this chain yet.",
  ],
  [/Indexed transfer activity/gi, "Transfer activity"],
  [
    /Indexed from genesis, no gaps, no unresolved spends, and near tip\./gi,
    "Complete chain history is available.",
  ],
  [
    /Historical index available; catching up to tip\./gi,
    "Historical data is available; recent blocks are still loading.",
  ],
  [
    /Historical balances are internally consistent, but the index is still catching up\./gi,
    "Historical balances look consistent, but recent blocks are still loading.",
  ],
  [
    /Indexed history is internally consistent, but tip status is not complete\./gi,
    "Historical data looks consistent, but the latest blocks are not fully loaded.",
  ],
  [/Index is up to date\./gi, "Up to date."],
  [/Up to date with the chain tip\./gi, "Up to date."],
  [/Chain tip unavailable\./gi, "Latest block height unavailable."],
  [
    /(\d[\d,]*) block(s?) behind chain tip\./gi,
    "$1 block$2 behind the latest block.",
  ],
  [/Indexer is behind the RPC tip\./gi, "Recent blocks are still loading."],
  [
    /Sync state does not match the highest indexed block\./gi,
    "Latest block data is still refreshing.",
  ],
  [/Indexed block heights have gaps\./gi, "Block history has gaps."],
  [
    /Index does not start at genesis, so balances cannot be trusted\./gi,
    "Chain history does not start at genesis, so balances may be incomplete.",
  ],
  [/is unavailable until blocks have been indexed\./gi, "is not available yet."],
  [/have been indexed/gi, "are available"],
  [/is indexed/gi, "is available"],
  [/catching up to tip/gi, "loading recent blocks"],
  [/the index is still catching up/gi, "recent blocks are still loading"],
  [/chain tip/gi, "latest block"],
  [/RPC tip/gi, "network"],
  [/At tip/gi, "Up to date"],
  [/Indexer/gi, "Explorer"],
  [/indexed/gi, "available"],
  [/\bSyncing\b/g, "Updating"],
  [/\bsyncing\b/g, "updating"],
  [/\bsync\b/gi, "update"],
  [/\btip\b/gi, "latest block"],
  [/\bindex\b/gi, "chain data"],
];

export function formatExplorerUserMessage(message: string): string {
  let result = message.trim();
  for (const [pattern, replacement] of USER_MESSAGE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
