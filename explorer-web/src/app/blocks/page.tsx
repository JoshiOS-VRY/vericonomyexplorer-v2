import { getBlockTip, getInternalApi } from "@/lib/api/legacy";
import { BlocksTable, PaginationBar } from "@/components/legacy/LegacyShared";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { normalizeLimit, normalizeOffset } from "@/lib/utils";
import type { RpcBlockRow } from "@/components/legacy/LegacyShared";

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

  try {
    const tip = await getBlockTip();
    const blockCount = tip.height;
    const heights: number[] = [];

    if (sort === "desc") {
      for (let i = blockCount - offset; i > blockCount - offset - limit; i--) {
        if (i >= 0) heights.push(i);
      }
    } else {
      for (let i = offset; i < offset + limit && i <= blockCount; i++) {
        heights.push(i);
      }
    }

    const blocks = heights.length
      ? await getInternalApi<RpcBlockRow[]>(
          `/blocks-by-height/${heights.join(",")}`,
        )
      : [];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Blocks</h1>
          <div className="flex gap-2">
            <Link href={`/blocks?limit=${limit}&offset=0&sort=desc`}>
              <Button variant={sort === "desc" ? "primary" : "secondary"} size="sm">
                Newest first
              </Button>
            </Link>
            <Link href={`/blocks?limit=${limit}&offset=0&sort=asc`}>
              <Button variant={sort === "asc" ? "primary" : "secondary"} size="sm">
                Oldest first
              </Button>
            </Link>
          </div>
        </div>
        {blocks.length === 0 ? (
          <p className="text-sm text-fg-muted">No blocks found.</p>
        ) : (
          <>
            <BlocksTable blocks={blocks.filter(Boolean)} />
            <PaginationBar
              basePath="/blocks"
              limit={limit}
              offset={offset}
              total={blockCount + 1}
              sort={sort}
            />
          </>
        )}
      </div>
    );
  } catch (error) {
    return (
      <AlertBanner title="Blocks Unavailable">
        {error instanceof Error ? error.message : "Unable to load blocks."}
      </AlertBanner>
    );
  }
}
