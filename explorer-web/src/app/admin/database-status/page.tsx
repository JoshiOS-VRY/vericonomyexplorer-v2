import { LegacyJsonView, loadLegacy } from "@/components/legacy/LegacyViews";
import { getIndexerHealth } from "@/lib/api/indexer";

export default async function AdminDatabaseStatusPage() {
  const { data, error } = await loadLegacy(getIndexerHealth);
  return <LegacyJsonView title="Database Status" data={data} error={error} />;
}
