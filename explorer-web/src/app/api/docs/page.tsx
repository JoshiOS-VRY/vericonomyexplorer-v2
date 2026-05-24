import { LegacyJsonView, loadLegacy } from "@/components/legacy/LegacyViews";
import { getApiVersion } from "@/lib/api/legacy";

export default async function ApiDocsPage() {
  const { data: version, error } = await loadLegacy(getApiVersion);
  return (
    <LegacyJsonView
      title="API Docs"
      subtitle={`Version: ${version ?? "unknown"}`}
      data={{
        version,
        docs: "Hot paths use explorer-api /v1/*. Legacy Express /api/* is for unmigrated admin/Pug pages.",
        indexerRoutes: [
          "/v1/health",
          "/v1/indexer/status",
          "/v1/landing",
          "/v1/vrm/dashboard",
          "/v1/:chain/tip/stream",
          "/v1/:chain/summary",
          "/v1/:chain/richlist",
          "/v1/:chain/leaderboard",
          "/v1/:chain/address/:address",
          "/v1/:chain/tx/:txid",
          "/v1/:chain/block/:hashOrHeight",
        ],
      }}
      error={error}
    />
  );
}
