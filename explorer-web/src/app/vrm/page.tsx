import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { VrmLiveDashboard } from "@/components/explorer/VrmLiveDashboard";
import { getVrmDashboard } from "@/lib/api/indexer";

export default async function VrmChainPage() {
  try {
    const { summary, richlist, leaderboard } = await getVrmDashboard();

    return (
      <>
        <UserMessageBanner />
        <VrmLiveDashboard
          initialSummary={summary}
          initialRichlist={richlist}
          initialLeaderboard={leaderboard}
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
