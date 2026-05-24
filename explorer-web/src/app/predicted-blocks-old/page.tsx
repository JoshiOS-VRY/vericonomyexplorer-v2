import { LegacyJsonView, loadLegacy } from "@/components/legacy/LegacyViews";
import { getInternalApi } from "@/lib/api/legacy";

export default async function PredictedBlocksOldPage() {
  const { data, error } = await loadLegacy(() =>
    getInternalApi("/predicted-blocks-status"),
  );
  return (
    <LegacyJsonView title="Predicted Blocks (Legacy)" data={data} error={error} />
  );
}
