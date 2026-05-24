import { PageHero, AlertBanner } from "@/components/explorer/ExplorerUi";

export default async function IndexerErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message =
    params.message ??
    "The index-backed explorer could not build this page.";

  return (
    <div className="space-y-6">
      <PageHero
        title="Indexer Error"
        subtitle="The index-backed explorer could not build this page."
      />
      <AlertBanner title="Indexer Page Error">{message}</AlertBanner>
    </div>
  );
}
