import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { VrcChainDashboard } from "@/components/explorer/vrc/VrcChainDashboard";
import { getChainSummary, getHomeMarket, getHomeNetwork, getRichlist } from "@/lib/api/indexer";
import { applyOnChainMarketCap } from "@/lib/enrichMarket";
import { emptyMarketPayload, emptyNetworkPayload } from "@/lib/homeDefaults";

export const revalidate = 30;

export default async function VrcChainPage() {
  try {
    const [summary, richlist, marketPayload, networkPayload] = await Promise.all([
      getChainSummary("vrc"),
      getRichlist("vrc", { limit: 10 }),
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
