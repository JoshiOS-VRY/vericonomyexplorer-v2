import { Suspense } from "react";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { InsightsDashboard } from "@/components/explorer/insights/InsightsDashboard";
import { getChainSummary } from "@/lib/api/indexer";

function parseChainId(value?: string): "vrm" | "vrc" {
  return value === "vrc" ? "vrc" : "vrm";
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string }>;
}) {
  const params = await searchParams;
  const chainId = parseChainId(params.chain);

  try {
    const summary = await getChainSummary(chainId);

    return (
      <Suspense fallback={<p className="text-sm text-fg-muted">Loading insights…</p>}>
        <InsightsDashboard chainId={chainId} summary={summary} />
      </Suspense>
    );
  } catch {
    return (
      <AlertBanner title="Insights Unavailable">
        Unable to load insights data from the explorer API.
      </AlertBanner>
    );
  }
}
