import { FeatureTile } from "@/components/explorer/ExplorerUi";

export function VrmQuickNav({ tipBlockHref }: { tipBlockHref: string | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <FeatureTile
        title="Verium rich list"
        description="Positive-balance VRM addresses ranked by balance."
        href="/vrm/richlist"
        hrefLabel="View rich list"
      />
      <FeatureTile
        title="Activity leaderboard"
        description="Monthly transfer activity ranked by address."
        href="/vrm/leaderboard?period=month&sort=activity"
        hrefLabel="View leaderboard"
      />
      <FeatureTile
        title="Latest block"
        description="Open the current chain tip block and its transactions."
        href={tipBlockHref ?? "/vrm"}
        hrefLabel={tipBlockHref ? "Open tip block" : "Explorer home"}
      />
      <FeatureTile
        title="API reference"
        description="REST endpoints for integrations and automation."
        href="/api/docs"
        hrefLabel="Read API docs"
      />
    </div>
  );
}
