import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { VericonomyHomeLiveBand } from "@/components/explorer/home/VericonomyHomeLiveBand";
import { VericonomyHomeRichlists } from "@/components/explorer/home/VericonomyHomeRichlists";
import { VericonomyHomeStatic } from "@/components/explorer/home/VericonomyHomeSections";
import { getHomeNetwork, getHomeShell } from "@/lib/api/indexer";
import type {
  ChainSummary,
  HomeNetworkPayload,
  HomeShellPayload,
  LeaderboardResult,
  RichlistResult,
} from "@/lib/api/types";

export const revalidate = 30;

export default async function HomePage() {
  let shell: HomeShellPayload;
  let network: HomeNetworkPayload | null = null;

  try {
    [shell, network] = await Promise.all([
      getHomeShell(),
      getHomeNetwork().catch(() => null),
    ]);
  } catch {
    return (
      <AlertBanner title="Explorer Unavailable">
        Unable to load chain data. Ensure the API server is running.
      </AlertBanner>
    );
  }

  if (!shell.vrm?.summary && !shell.vrc?.summary) {
    return (
      <AlertBanner title="Explorer Unavailable">
        Unable to load chain data. Ensure the API server is running.
      </AlertBanner>
    );
  }

  const normalized = normalizeShell(shell);

  return (
    <div className="home-page space-y-10">
      <UserMessageBanner />
      <VericonomyHomeLiveBand
        initialShell={normalized}
        initialNetwork={network ?? undefined}
      />

      <VericonomyHomeRichlists
        vrmRichlist={normalized.vrm.richlist}
        vrcRichlist={normalized.vrc.richlist}
        vrmSummary={normalized.vrm.summary}
        vrcSummary={normalized.vrc.summary}
        initialNetwork={network ?? undefined}
      />

      <VericonomyHomeStatic />
    </div>
  );
}

function normalizeShell(shell: HomeShellPayload): HomeShellPayload {
  return {
    vrm: {
      summary: shell.vrm?.summary ?? emptySummary("vrm"),
      richlist: shell.vrm?.richlist ?? emptyRichlist("vrm"),
    },
    vrc: {
      summary: shell.vrc?.summary ?? emptySummary("vrc"),
      richlist: shell.vrc?.richlist ?? emptyRichlist("vrc"),
    },
    vrmLeaderboard: shell.vrmLeaderboard ?? emptyLeaderboard(),
    fetchedAt: shell.fetchedAt ?? new Date().toISOString(),
  };
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

function emptyRichlist(chainId: string): RichlistResult {
  return {
    chainId,
    trusted: false,
    enabled: false,
    source: { label: "unavailable" },
    items: [],
  };
}

function emptyLeaderboard(): LeaderboardResult {
  return {
    chainId: "vrm",
    trusted: false,
    enabled: false,
    source: { label: "unavailable" },
    items: [],
  };
}
