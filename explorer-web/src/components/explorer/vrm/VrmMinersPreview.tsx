"use client";

import { useCallback, useState } from "react";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import { RankList, formatHeight } from "@/components/explorer/ExplorerUi";
import { ChainPanelLink } from "@/components/explorer/chain/ChainPanelLink";
import { MinersPeriodPicker } from "@/components/explorer/vrm/MinersPeriodPicker";
import type { MinersLeaderboardResult } from "@/lib/api/types";
import { fetchMinersLeaderboardClient } from "@/lib/api/client";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import {
  normalizeMinersPeriod,
  type MinersPeriodId,
} from "@/lib/minersPeriods";
import { VrmAddressLabel } from "@/components/explorer/address/VrmAddressLink";

export function VrmMinersPreview({
  miners: initialMiners,
}: {
  miners: MinersLeaderboardResult;
}) {
  const [miners, setMiners] = useState(initialMiners);
  const [period, setPeriod] = useState<MinersPeriodId>(
    normalizeMinersPeriod(initialMiners.period?.type, "month"),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPeriod = useCallback(
    async (nextPeriod: MinersPeriodId) => {
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
      <div className="mb-3">
        <MinersPeriodPicker
          period={period}
          loading={loading}
          onSelect={(next) => void loadPeriod(next)}
        />
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
            label: <VrmAddressLabel address={item.address} maxLength={18} />,
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
