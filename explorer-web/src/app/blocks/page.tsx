import { BlocksPageClient } from "@/components/legacy/BlocksPageClient";
import { normalizeLimit, normalizeOffset } from "@/lib/utils";

const DEFAULT_LIMIT = 25;

export default async function BlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string; offset?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const limit = normalizeLimit(params.limit, DEFAULT_LIMIT);
  const offset = normalizeOffset(params.offset);
  const sort = params.sort === "asc" ? "asc" : "desc";

  return <BlocksPageClient limit={limit} offset={offset} sort={sort} />;
}
