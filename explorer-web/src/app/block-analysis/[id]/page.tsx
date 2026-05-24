import { LegacyJsonView, loadLegacy } from "@/components/legacy/LegacyViews";
import { getBlockByHashOrHeight } from "@/lib/api/legacy";

export default async function BlockAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, error } = await loadLegacy(() => getBlockByHashOrHeight(id));
  return (
    <LegacyJsonView title="Block Analysis" subtitle={id} data={data} error={error} />
  );
}
