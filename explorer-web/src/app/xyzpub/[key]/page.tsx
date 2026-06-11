import { LegacyJsonView, loadLegacy } from '@/components/legacy/LegacyViews';
import { apiFetch } from '@/lib/api/config';

export default async function XyzpubPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { data, error } = await loadLegacy(() =>
    apiFetch(`/api/xyzpub/${encodeURIComponent(key)}`)
  );
  return <LegacyJsonView title="Extended Public Key" subtitle={key} data={data} error={error} />;
}
