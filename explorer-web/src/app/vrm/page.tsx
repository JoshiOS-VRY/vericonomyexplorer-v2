import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { VrmChainDashboard } from "@/components/explorer/vrm/VrmChainDashboard";
import { getHomeMarket, getHomeNetwork, getVrmDashboard } from "@/lib/api/indexer";
import { applyOnChainMarketCap } from "@/lib/enrichMarket";
import { emptyMarketPayload, emptyNetworkPayload } from "@/lib/homeDefaults";

export const revalidate = 30;

export default async function VrmChainPage() {
  try {
    const [dashboard, marketPayload, networkPayload] = await Promise.all([
      getVrmDashboard(),
      getHomeMarket().catch(() => emptyMarketPayload()),
      getHomeNetwork().catch(() => emptyNetworkPayload()),
    ]);

    const market = applyOnChainMarketCap(
      marketPayload.vrm,
      "vrm",
      networkPayload.vrm.supply,
    );

    return (
      <>
        <UserMessageBanner />
        <VrmChainDashboard
          {...dashboard}
          initialMarket={market}
          initialNetwork={networkPayload.vrm}
        />
      </>
    );
  } catch {
    return (
      <AlertBanner title="Verium Explorer Unavailable">
        Unable to load Verium chain data from the explorer API.
      </AlertBanner>
    );
  }
}
