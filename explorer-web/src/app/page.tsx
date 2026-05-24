import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { ExplorerHomeDashboard } from "@/components/explorer/ExplorerHomeDashboard";
import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { getLandingData } from "@/lib/api/indexer";
import type { ChainSummary } from "@/lib/api/types";

export default async function HomePage() {
  let landing;

  try {
    landing = await getLandingData();
  } catch {
    return (
      <AlertBanner title="Explorer Unavailable">
        Unable to load chain data from the indexer API. Ensure the API server and indexer worker are running.
      </AlertBanner>
    );
  }

  const { vrmSummary, vrcSummary, vrmRichlist, vrcRichlist, vrmLeaderboard } = landing;

  if (!vrmSummary && !vrcSummary) {
    return (
      <AlertBanner title="Explorer Unavailable">
        Unable to load chain data from the indexer API. Ensure the API server and indexer worker are running.
      </AlertBanner>
    );
  }

  return (
    <>
      <UserMessageBanner />
      <ExplorerHomeDashboard
        vrmSummary={vrmSummary ?? emptySummary("vrm")}
        vrcSummary={vrcSummary ?? emptySummary("vrc")}
        vrmRichlist={vrmRichlist}
        vrcRichlist={vrcRichlist}
        vrmLeaderboard={vrmLeaderboard}
      />
    </>
  );
}

function emptySummary(chainId: "vrm" | "vrc"): ChainSummary {
  const name = chainId === "vrm" ? "Verium" : "VeriCoin";
  const ticker = chainId.toUpperCase();
  return {
    chainId,
    health: {
      id: chainId,
      ticker,
      name,
      consensus: chainId === "vrm" ? "PoWT" : "PoST",
      status: "Unavailable",
      trusted: false,
      message: "Chain data could not be loaded.",
      checks: {},
      heights: {
        bestRpcHeight: null,
        minIndexedHeight: null,
        maxIndexedHeight: null,
        lastIndexedHeight: null,
        blocksBehind: null,
      },
      counts: {
        indexedBlockCount: 0,
        expectedBlockCount: 0,
        gapCount: 0,
        unresolvedSpendCount: 0,
        addressCount: 0,
      },
      sourceLabels: {},
    },
    latestBlocks: [],
    recentTransactions: [],
    source: { label: "unavailable" },
  };
}
