import { LegacyJsonView, loadLegacy } from '@/components/legacy/LegacyViews';
import { getInternalApi } from '@/lib/api/legacy';

export default async function BlockStatsPage() {
  const { data, error } = await loadLegacy(() => getInternalApi('/block-stats-by-height/0'));
  return <LegacyJsonView title="Block Stats" data={data} error={error} />;
}
