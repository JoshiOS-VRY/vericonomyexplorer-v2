"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import { RankList, formatHeight } from "@/components/explorer/ExplorerUi";
import { ChainPanelLink } from "@/components/explorer/chain/ChainPanelLink";
import { Button } from "@/components/ui/Button";
import type { MinersLeaderboardResult } from "@/lib/api/types";
import { fetchMinersLeaderboardClient } from "@/lib/api/client";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { ellipsizeMiddle } from "@/lib/utils";

const PERIODS = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" },
] as const;

type MinersPeriod = (typeof PERIODS)[number]["id"];

export function VrmMinersPreview({
  miners: initialMiners,
}: {
  miners: MinersLeaderboardResult;
}) {
  const [miners, setMiners] = useState(initialMiners);
  const [period, setPeriod] = useState<MinersPeriod>(
    (initialMiners.period?.type as MinersPeriod) || "month",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPeriod = useCallback(
    async (nextPeriod: MinersPeriod) => {
      if (nextPeriod === period || loading) {
        return;
      }

      setLoading(true);
      setPeriod(nextPeriod);
      setError(null);

      try {
        const result = await fetchMinersLeaderboardClient("vrm", {
          period: nextPeriod,
          limit: 5,
        });
        setMiners(result);
      } catch {
        setError("Unable to load miners for this period.");
      } finally {
        setLoading(false);
      }
    },
    [loading, period],
  );

  return (
    <BcPanel
      title="Top miners"
      action={
        <ChainPanelLink href={`/vrm/miners?period=${period}`} label="Miners" />
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {PERIODS.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={period === option.id ? "primary" : "secondary"}
            size="sm"
            disabled={loading}
            onClick={() => void loadPeriod(option.id)}
          >
            {option.label}
          </Button>
        ))}
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Loading…
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : !miners.enabled && miners.message ? (
        <p className="text-sm text-fg-muted">
          {formatExplorerUserMessage(miners.message)}
        </p>
      ) : miners.items.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {loading ? "Loading miners…" : "No mining rewards recorded yet."}
        </p>
      ) : (
        <RankList
          items={miners.items.map((item) => ({
            href: `/vrm/address/${item.address}`,
            rank: item.rank,
            label: ellipsizeMiddle(item.address, 18),
            value:
              item.blockCount > 0
                ? `${item.mined.amount} ${item.mined.ticker} · ${formatHeight(item.blockCount)} blk`
                : `${item.mined.amount} ${item.mined.ticker}`,
          }))}
        />
      )}
    </BcPanel>
  );
}
