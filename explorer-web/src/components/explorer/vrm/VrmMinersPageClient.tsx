"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  DataTable,
  PaginationLinks,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { MinersPeriodPicker } from "@/components/explorer/vrm/MinersPeriodPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { fetchMinersLeaderboardClient } from "@/lib/api/client";
import type { MinersLeaderboardResult } from "@/lib/api/types";
import {
  normalizeMinersPeriod,
  type MinersPeriodId,
} from "@/lib/minersPeriods";
import { cn } from "@/lib/utils";

export function VrmMinersPageClient({
  initialMiners,
  initialPeriod,
  limit,
  offset,
}: {
  initialMiners: MinersLeaderboardResult;
  initialPeriod: MinersPeriodId;
  limit: number;
  offset: number;
}) {
  const router = useRouter();
  const [miners, setMiners] = useState(initialMiners);
  const [period, setPeriod] = useState<MinersPeriodId>(
    normalizeMinersPeriod(initialPeriod),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeriod = useCallback(
    async (nextPeriod: MinersPeriodId) => {
      if (nextPeriod === period || loading) {
        return;
      }

      setLoading(true);
      setError(null);
      setPeriod(nextPeriod);

      const params = new URLSearchParams({ period: nextPeriod });
      if (limit !== 50) {
        params.set("limit", String(limit));
      }
      router.replace(`/vrm/miners?${params.toString()}`, { scroll: false });

      try {
        const result = await fetchMinersLeaderboardClient("vrm", {
          period: nextPeriod,
          limit,
          offset: 0,
        });
        setMiners(result);
      } catch {
        setError("Unable to load miners for this period.");
      } finally {
        setLoading(false);
      }
    },
    [limit, loading, period, router],
  );

  return (
    <>
      <MinersPeriodPicker
        period={period}
        loading={loading}
        onSelect={(next) => void loadPeriod(next)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Mined VRM</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          {loading && miners.items.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-sm text-fg-muted">
              Loading miners…
            </div>
          ) : miners.items.length === 0 ? (
            <p className="py-8 text-sm text-fg-muted">
              No mining rewards recorded for this period.
            </p>
          ) : (
            <div className={cn(loading && "pointer-events-none opacity-60")}>
              <DataTable
                headers={["Rank", "Address", "Mined", "Blocks", "Last block"]}
                rows={miners.items.map((item) => [
                  `#${item.rank}`,
                  <Link
                    key="a"
                    href={`/vrm/address/${item.address}`}
                    className="text-xs text-accent hover:underline"
                  >
                    {item.address}
                  </Link>,
                  `${item.mined.amount} ${item.mined.ticker}`,
                  formatHeight(item.blockCount),
                  item.lastMinedHeight != null ? (
                    <Link key="lb" href={`/vrm/block/${item.lastMinedHeight}`}>
                      {formatHeight(item.lastMinedHeight)}
                    </Link>
                  ) : (
                    "N/A"
                  ),
                ])}
              />
            </div>
          )}
          <PaginationLinks
            basePath="/vrm/miners"
            paging={miners.paging ?? { limit, offset, total: 0, hasMore: false }}
            extraParams={{ period }}
          />
        </CardContent>
      </Card>
    </>
  );
}
