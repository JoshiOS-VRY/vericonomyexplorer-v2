import { clientApiFetch } from "@/lib/api/client";
import type { AddressBalanceHistoryPeriodId } from "@/lib/api/types";
import {
  getInsightsHistoryMaxPoints,
  getInsightsHistorySince,
  type InsightsHistoryGroupBy,
} from "@/lib/insightsChartConfig";

export interface NetworkMetricBucket {
  startTime: number;
  endTime: number;
  label: string;
  difficulty: number | null;
  blockHeight: number | null;
  supply: number | null;
  hashrateKhPerMin: number | null;
  interestRatePercent: number | null;
  netStakeWeight: number | null;
  percentStaked: number | null;
  expectedStakeTimeSeconds: number | null;
  addressCount: number | null;
}

export interface NetworkMetricHistoryResult {
  chainId: string;
  trusted?: boolean;
  since?: number | null;
  groupBy?: InsightsHistoryGroupBy | null;
  backfillRequired?: boolean;
  availableSince?: number | null;
  buckets: NetworkMetricBucket[];
}

export async function fetchNetworkHistoryClient(
  chainId: string,
  periodId: AddressBalanceHistoryPeriodId,
  groupBy: InsightsHistoryGroupBy,
): Promise<NetworkMetricHistoryResult> {
  const search = new URLSearchParams();
  search.set("maxPoints", String(getInsightsHistoryMaxPoints(periodId)));
  search.set("groupBy", groupBy);
  const since = getInsightsHistorySince(periodId);
  if (since != null) {
    search.set("since", String(since));
  }

  return clientApiFetch<NetworkMetricHistoryResult>(
    `/${chainId}/insights/network-history?${search.toString()}`,
  );
}
