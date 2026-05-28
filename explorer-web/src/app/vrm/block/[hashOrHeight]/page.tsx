import {
  BlockDetailPage,
  blockDetailSearchParams,
} from "@/components/explorer/pages/BlockDetailPage";

export default async function VrmBlockPage({
  params,
  searchParams,
}: {
  params: Promise<{ hashOrHeight: string }>;
  searchParams: Promise<{ limit?: string; offset?: string }>;
}) {
  const { hashOrHeight } = await params;
  const { limit, offset } = blockDetailSearchParams(await searchParams);

  return (
    <BlockDetailPage
      chainId="vrm"
      hashOrHeight={hashOrHeight}
      limit={limit}
      offset={offset}
    />
  );
}
