import { BcPanel } from "@/components/explorer/BlockchairUi";
import { RankList, formatHeight } from "@/components/explorer/ExplorerUi";
import { VrmPanelLink } from "@/components/explorer/vrm/VrmBlocksPanel";
import type { LeaderboardResult } from "@/lib/api/types";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { ellipsizeMiddle } from "@/lib/utils";

export function VrmLeaderboardPreview({ leaderboard }: { leaderboard: LeaderboardResult }) {
  return (
    <BcPanel
      title="Activity"
      action={
        <VrmPanelLink
          href="/vrm/leaderboard?period=month&sort=activity"
          label="Leaderboard"
        />
      }
    >
      {!leaderboard.enabled && leaderboard.message ? (
        <p className="text-sm text-fg-muted">
          {formatExplorerUserMessage(leaderboard.message)}
        </p>
      ) : leaderboard.items.length === 0 ? (
        <p className="text-sm text-fg-muted">No activity rankings yet.</p>
      ) : (
        <RankList
          items={leaderboard.items.map((item) => ({
            href: `/vrm/address/${item.address}`,
            rank: item.rank,
            label: ellipsizeMiddle(item.address, 18),
            value: `${formatHeight(item.txCount)} tx`,
          }))}
        />
      )}
    </BcPanel>
  );
}
