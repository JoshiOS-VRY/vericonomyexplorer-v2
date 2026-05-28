"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BlocksTable, PaginationBar, type RpcBlockRow } from "@/components/legacy/LegacyShared";
import { AlertBanner } from "@/components/explorer/ExplorerUi";
import { Button } from "@/components/ui/Button";
import { fetchLegacyBlockTip, fetchLegacyBlocksByHeight } from "@/lib/api/client";

const DEFAULT_LIMIT = 25;

export function BlocksPageClient({
  limit,
  offset,
  sort,
}: {
  limit: number;
  offset: number;
  sort: "asc" | "desc";
}) {
  const [blocks, setBlocks] = useState<RpcBlockRow[]>([]);
  const [blockCount, setBlockCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const tip = await fetchLegacyBlockTip();
        const count = tip.height;
        const heights: number[] = [];

        if (sort === "desc") {
          for (let i = count - offset; i > count - offset - limit; i--) {
            if (i >= 0) heights.push(i);
          }
        } else {
          for (let i = offset; i < offset + limit && i <= count; i++) {
            heights.push(i);
          }
        }

        const rows = heights.length
          ? await fetchLegacyBlocksByHeight<RpcBlockRow[]>(heights)
          : [];

        if (!cancelled) {
          setBlockCount(count);
          setBlocks(rows.filter(Boolean));
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit, offset, sort]);

  if (failed) {
    return (
      <AlertBanner title="Blocks Unavailable">
        Unable to load blocks from the node.
      </AlertBanner>
    );
  }

  if (blockCount === null) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-bg-subtle" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-bg-subtle" />
      </div>
    );
  }

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
          <BlocksTable blocks={blocks} />
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
}
