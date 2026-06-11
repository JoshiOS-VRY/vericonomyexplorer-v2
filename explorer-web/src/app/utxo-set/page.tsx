import { LegacyJsonView, loadLegacy } from '@/components/legacy/LegacyViews';
import { getUtxoSet } from '@/lib/api/legacy';

export default async function UtxoSetPage() {
  const { data, error } = await loadLegacy(getUtxoSet);
  return <LegacyJsonView title="UTXO Set" data={data} error={error} />;
}
