"use client";

import { useCallback, useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

  const loadPeriod = useCallback((nextPeriod: MinersPeriod) => {
    setPeriod(nextPeriod);
    setError(null);

    startTransition(async () => {
      try {
        const result = await fetchMinersLeaderboardClient("vrm", {
          period: nextPeriod,
          limit: 5,
        });
        setMiners(result);
      } catch {
        setError("Unable to load miners for this period.");
      }
    });
  }, []);

  return (
    <BcPanel
      title="Top miners"
      action={
        <ChainPanelLink href={`/vrm/miners?period=${period}`} label="Miners" />
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PERIODS.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={period === option.id ? "primary" : "secondary"}
            size="sm"
            disabled={isPending}
            onClick={() => loadPeriod(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : !miners.enabled && miners.message ? (
        <p className="text-sm text-fg-muted">
          {formatExplorerUserMessage(miners.message)}
        </p>
      ) : miners.items.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {isPending ? "Loading miners…" : "No mining rewards recorded yet."}
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
