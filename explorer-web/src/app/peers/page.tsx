import { LegacyJsonView, loadLegacy } from "@/components/legacy/LegacyViews";
import { getInternalApi } from "@/lib/api/legacy";

export default async function PeersPage() {
  const { data, error } = await loadLegacy(() =>
    getInternalApi("/utils/getpeerinfo/[]"),
  );
  return <LegacyJsonView title="Peers" data={data} error={error} />;
}
