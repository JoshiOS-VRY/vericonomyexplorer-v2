import { clientApiFetch } from "@/lib/api/client";
import type {
  AddressBalanceHistoryPeriodId,
  AddressBalanceHistoryResult,
} from "@/lib/api/types";

/** Poll while the address page is visible (matches latest-blocks aggressiveness). */
export const ADDRESS_BALANCE_HISTORY_POLL_MS = 10_000;

export const ADDRESS_BALANCE_HISTORY_PERIODS: {
  id: AddressBalanceHistoryPeriodId;
  label: string;
  days: number | null;
  maxPoints: number;
}[] = [
  { id: "7d", label: "7D", days: 7, maxPoints: 80 },
  { id: "30d", label: "30D", days: 30, maxPoints: 100 },
  { id: "90d", label: "90D", days: 90, maxPoints: 100 },
  { id: "1y", label: "1Y", days: 365, maxPoints: 120 },
  { id: "all", label: "All", days: null, maxPoints: 120 },
];

export function getBalanceHistorySince(periodId: AddressBalanceHistoryPeriodId): number | undefined {
  const period = ADDRESS_BALANCE_HISTORY_PERIODS.find((item) => item.id === periodId);
  if (!period?.days) {
    return undefined;
  }

  return Math.floor(Date.now() / 1000) - period.days * 86_400;
}

export function getBalanceHistoryMaxPoints(periodId: AddressBalanceHistoryPeriodId): number {
  return ADDRESS_BALANCE_HISTORY_PERIODS.find((item) => item.id === periodId)?.maxPoints ?? 120;
}

export function isSameAddressBalanceHistory(
  previous: AddressBalanceHistoryResult | null,
  next: AddressBalanceHistoryResult,
): boolean {
  if (!previous) {
    return false;
  }

  if (
    previous.currentBalanceAtomic !== next.currentBalanceAtomic ||
    previous.eventCount !== next.eventCount ||
    previous.truncated !== next.truncated
  ) {
    return false;
  }

  const tailBuckets = (rows: AddressBalanceHistoryResult["buckets"]) =>
    rows.slice(-2).map((row) =>
      [
        row.startTime,
        row.minedAtomic,
        row.stakedAtomic,
        row.receivedAtomic,
        row.spentAtomic,
      ].join(":"),
    );

  const tailPoints = (rows: AddressBalanceHistoryResult["points"]) =>
    rows.slice(-2).map((row) => `${row.time}:${row.balanceAtomic}`);

  return (
    tailBuckets(previous.buckets).join("|") === tailBuckets(next.buckets).join("|") &&
    tailPoints(previous.points).join("|") === tailPoints(next.points).join("|")
  );
}

export async function fetchAddressBalanceHistoryClient(
  chainId: string,
  address: string,
  periodId: AddressBalanceHistoryPeriodId,
): Promise<AddressBalanceHistoryResult> {
  const search = new URLSearchParams();
  search.set("maxPoints", String(getBalanceHistoryMaxPoints(periodId)));
  const since = getBalanceHistorySince(periodId);
  if (since != null) {
    search.set("since", String(since));
  }

  return clientApiFetch<AddressBalanceHistoryResult>(
    `/${chainId}/address/${encodeURIComponent(address)}/balance-history?${search.toString()}`,
  );
}
