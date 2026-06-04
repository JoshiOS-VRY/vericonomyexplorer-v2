import { ChainLeaderboardPreview } from "@/components/explorer/chain/ChainLeaderboardPreview";
import type { LeaderboardResult } from "@/lib/api/types";

/** @deprecated Use ChainLeaderboardPreview */
export function VrmLeaderboardPreview({ leaderboard }: { leaderboard: LeaderboardResult }) {
  return <ChainLeaderboardPreview chainId="vrm" leaderboard={leaderboard} />;
}
