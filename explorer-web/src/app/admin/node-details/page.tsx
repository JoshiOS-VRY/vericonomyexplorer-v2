import { LegacyJsonView, loadLegacy } from '@/components/legacy/LegacyViews';
import { getInternalApi } from '@/lib/api/legacy';

export default async function AdminNodeDetailsPage() {
  const { data, error } = await loadLegacy(() => getInternalApi('/utils/getblockchaininfo/[]'));
  return <LegacyJsonView title="Node Details" data={data} error={error} />;
}
