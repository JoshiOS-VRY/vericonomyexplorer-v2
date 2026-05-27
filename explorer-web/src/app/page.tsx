import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { UserMessageBanner } from "@/components/explorer/UserMessageBanner";
import { VericonomyHomeLiveBand } from "@/components/explorer/home/VericonomyHomeLiveBand";
import { VericonomyHomeStatic } from "@/components/explorer/home/VericonomyHomeSections";
import { getHomeMarket, getHomeNetwork, getHomeShell } from "@/lib/api/indexer";
import { enrichHomeNetworkPayload } from "@/lib/enrichNetwork";
import type {
  ChainSummary,
  HomeMarketPayload,
  HomeNetworkPayload,
  HomeShellPayload,
  LeaderboardResult,
  RichlistResult,
} from "@/lib/api/types";

export default async function HomePage() {
  let shell: HomeShellPayload;
  let market: HomeMarketPayload;
  let network: HomeNetworkPayload;

  try {
    [shell, market, network] = await Promise.all([
      getHomeShell(),
      getHomeMarket().catch(() => emptyMarketPayload()),
      getHomeNetwork().catch(() => emptyNetworkPayload()),
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
  const networkPayload = enrichHomeNetworkPayload(
    network,
    normalized.vrm.summary,
    normalized.vrc.summary,
  );

  return (
    <div className="space-y-8">
      <UserMessageBanner />
      <VericonomyHomeLiveBand
        initialShell={normalized}
        market={market}
        network={networkPayload}
      />

      <VericonomyHomeStatic
        vrmRichlist={normalized.vrm.richlist}
        vrcRichlist={normalized.vrc.richlist}
        vrmLeaderboard={normalized.vrmLeaderboard}
      />
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

function emptyMarketPayload(): HomeMarketPayload {
  const empty = {
    usd: null,
    btc: null,
    marketCap: null,
    volume24h: null,
    change24h: null,
    circulatingSupply: null,
    source: "unavailable" as const,
    updatedAt: null,
    priceHistory24h: [],
  };

  return {
    vrm: empty,
    vrc: empty,
    fetchedAt: new Date().toISOString(),
  };
}

function emptyNetworkPayload(): HomeNetworkPayload {
  return {
    vrm: {
      hashrateKhPerMin: null,
      hashrate7dKhPerMin: null,
      difficulty: null,
      blocks: null,
      supply: null,
      maxSupply: null,
    },
    vrc: {
      difficulty: null,
      blocks: null,
      supply: null,
      maxSupply: null,
      interestRatePercent: null,
      netStakeWeight: null,
      percentStaked: null,
      expectedStakeTimeSeconds: null,
    },
    fetchedAt: new Date().toISOString(),
  };
}
