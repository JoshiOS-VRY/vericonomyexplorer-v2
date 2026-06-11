import { BcPanel } from '@/components/explorer/BlockchairUi';
import { RankList, formatHeight } from '@/components/explorer/ExplorerUi';
import { ChainPanelLink } from '@/components/explorer/chain/ChainPanelLink';
import { VrmAddressLabel } from '@/components/explorer/address/VrmAddressLink';
import type { LeaderboardResult } from '@/lib/api/types';
import { chainAddressPath, type ChainId } from '@/lib/chainDisplay';
import { formatExplorerUserMessage } from '@/lib/explorerCopy';
import { ellipsizeMiddle } from '@/lib/utils';

export function ChainLeaderboardPreview({
  chainId,
  leaderboard,
}: {
  chainId: ChainId;
  leaderboard: LeaderboardResult;
}) {
  const leaderboardHref = `/${chainId}/leaderboard?period=month&sort=activity`;

  return (
    <BcPanel
      title="Activity"
      action={<ChainPanelLink href={leaderboardHref} label="Leaderboard" />}
    >
      {!leaderboard.enabled && leaderboard.message ? (
        <p className="text-sm text-fg-muted">{formatExplorerUserMessage(leaderboard.message)}</p>
      ) : leaderboard.items.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {leaderboard.backfillRequired
            ? 'Transfer activity is still being collected.'
            : 'No activity rankings yet.'}
        </p>
      ) : (
        <RankList
          items={leaderboard.items.map((item) => ({
            href: chainAddressPath(chainId, item.address),
            rank: item.rank,
            label:
              chainId === 'vrm' ? (
                <VrmAddressLabel address={item.address} maxLength={18} />
              ) : (
                <span className="font-mono" title={item.address}>
                  {ellipsizeMiddle(item.address, 18)}
                </span>
              ),
            value: `${formatHeight(item.txCount)} tx`,
          }))}
        />
      )}
    </BcPanel>
  );
}
