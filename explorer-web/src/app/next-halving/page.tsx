import { LegacyJsonView, loadLegacy } from "@/components/legacy/LegacyViews";
import { getNextHalving } from "@/lib/api/legacy";

export default async function NextHalvingPage() {
  const { data, error } = await loadLegacy(getNextHalving);
  return <LegacyJsonView title="Next Halving" data={data} error={error} />;
}
