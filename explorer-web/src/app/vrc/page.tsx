import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { VrcChainDashboard } from "@/components/explorer/vrc/VrcChainDashboard";
import { getChainSummary, getRichlist } from "@/lib/api/indexer";

export default async function VrcChainPage() {
  try {
    const [summary, richlist] = await Promise.all([
      getChainSummary("vrc"),
      getRichlist("vrc", { limit: 10 }),
    ]);

    return (
      <>
        <UserMessageBanner />
        <VrcChainDashboard summary={summary} richlist={richlist} />
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
