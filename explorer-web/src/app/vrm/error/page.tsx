import { PageHero, AlertBanner } from '@/components/explorer/ExplorerUi';

export default async function ExplorerErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message = params.message ?? 'The explorer could not build this page.';

  return (
    <div className="space-y-6">
      <PageHero title="Explorer error" subtitle="The explorer could not build this page." />
      <AlertBanner title="Page error">{message}</AlertBanner>
    </div>
  );
}
