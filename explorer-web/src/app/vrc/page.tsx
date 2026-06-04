import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { VrcChainDashboard } from "@/components/explorer/vrc/VrcChainDashboard";
import {
  getChainSummary,
  getHomeMarket,
  getHomeNetwork,
  getLeaderboard,
  getRichlist,
} from "@/lib/api/indexer";
import type { LeaderboardResult } from "@/lib/api/types";
import { applyOnChainMarketCap } from "@/lib/enrichMarket";
import { emptyMarketPayload, emptyNetworkPayload } from "@/lib/homeDefaults";

const emptyVrcLeaderboard: LeaderboardResult = {
  chainId: "vrc",
  trusted: false,
  enabled: false,
  items: [],
  source: { label: "unavailable" },
};

export const revalidate = 30;

export default async function VrcChainPage() {
  try {
    const [summary, richlist, leaderboard, marketPayload, networkPayload] =
      await Promise.all([
        getChainSummary("vrc"),
        getRichlist("vrc", { limit: 5 }),
        getLeaderboard("vrc", {
          period: "month",
          sort: "activity",
          limit: 5,
        }).catch(() => emptyVrcLeaderboard),
        getHomeMarket().catch(() => emptyMarketPayload()),
        getHomeNetwork().catch(() => emptyNetworkPayload()),
      ]);

    const market = applyOnChainMarketCap(
      marketPayload.vrc,
      "vrc",
      networkPayload.vrc.supply,
    );

    return (
      <>
        <UserMessageBanner />
        <VrcChainDashboard
          summary={summary}
          richlist={richlist}
          leaderboard={leaderboard}
          initialMarket={market}
          initialNetwork={networkPayload.vrc}
        />
      </>
    );
  } catch {
    return (
      <AlertBanner title="VeriCoin Explorer Unavailable">
        Unable to load VeriCoin chain data from the explorer API.
      </AlertBanner>
    );
  }
}
