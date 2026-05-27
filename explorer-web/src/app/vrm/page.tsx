import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { VrmChainDashboard } from "@/components/explorer/vrm/VrmChainDashboard";
import { getVrmDashboard } from "@/lib/api/indexer";

export default async function VrmChainPage() {
  try {
    const dashboard = await getVrmDashboard();

    return (
      <>
        <UserMessageBanner />
        <VrmChainDashboard {...dashboard} />
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
