import { LegacyJsonView, loadLegacy } from "@/components/legacy/LegacyViews";
import { getInternalApi } from "@/lib/api/legacy";

export default async function PredictedBlocksPage() {
  const { data, error } = await loadLegacy(() =>
    getInternalApi("/get-predicted-blocks"),
  );
  return (
    <LegacyJsonView title="Predicted Blocks" data={data} error={error} />
  );
}
