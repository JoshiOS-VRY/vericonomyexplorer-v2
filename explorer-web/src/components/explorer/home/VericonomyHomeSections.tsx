import { FeatureTile } from "@/components/explorer/ExplorerUi";

export function VericonomyHomeStatic() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <FeatureTile
        title="Verium rich list"
        description="Positive-balance VRM addresses ranked by balance."
        href="/vrm/richlist"
        hrefLabel="View rich list"
      />
      <FeatureTile
        title="Verium activity"
        description="Monthly transfer activity leaderboard by address."
        href="/vrm/leaderboard?period=month&sort=activity"
        hrefLabel="View leaderboard"
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
