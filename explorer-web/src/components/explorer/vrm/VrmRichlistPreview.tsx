import { BcPanel } from "@/components/explorer/BlockchairUi";
import { RankList } from "@/components/explorer/ExplorerUi";
import { VrmPanelLink } from "@/components/explorer/vrm/VrmBlocksPanel";
import type { RichlistResult } from "@/lib/api/types";
import { ellipsizeMiddle } from "@/lib/utils";

export function VrmRichlistPreview({ richlist }: { richlist: RichlistResult }) {
  return (
    <BcPanel title="Rich list" action={<VrmPanelLink href="/vrm/richlist" label="View all" />}>
      {!richlist.enabled && richlist.message ? (
        <p className="text-sm text-fg-muted">{richlist.message}</p>
      ) : richlist.items.length === 0 ? (
        <p className="text-sm text-fg-muted">No ranked balances yet.</p>
      ) : (
        <RankList
          items={richlist.items.map((item) => ({
            href: `/vrm/address/${item.address}`,
            rank: item.rank,
            label: ellipsizeMiddle(item.address, 18),
            value: `${item.balance.amount} ${item.balance.ticker}`,
          }))}
        />
      )}
    </BcPanel>
  );
}
