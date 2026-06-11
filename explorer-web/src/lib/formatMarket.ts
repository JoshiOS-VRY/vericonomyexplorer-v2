import { formatCompactBalance } from '@/lib/utils';
import { formatNetworkHashrateKhPerMin } from '@vericonomy/network-metrics';

export function formatUsdPrice(value: number | null | undefined, digits?: number): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const resolvedDigits =
    digits ?? (value < 0.000001 ? 10 : value < 0.0001 ? 8 : value < 0.01 ? 6 : value < 1 ? 4 : 2);
  // When digits aren't explicitly requested, allow up to the tier precision but
  // trim trailing zeros down to a 2-decimal floor (e.g. 0.07 -> "$0.07", not
  // "$0.0700"), while still keeping significant digits for sub-cent prices.
  const minimumFractionDigits = digits != null ? resolvedDigits : Math.min(2, resolvedDigits);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits: resolvedDigits,
  }).format(value);
}

export function formatUsdCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBtcPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 0.0001) return value.toFixed(8).replace(/\.?0+$/, '');
  return value.toFixed(9).replace(/\.?0+$/, '');
}

export function formatSupply(value: number | null | undefined, ticker: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)} ${ticker}`;
}

/** Compact supply for tight hub stat cells (e.g. 56.26M VRC). */
export function formatHubSupply(value: number | null | undefined, ticker: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${formatCompactBalance(value)} ${ticker}`;
}

export function formatHashrateKhPerMin(value: number | null | undefined): string {
  return formatNetworkHashrateKhPerMin(value);
}

export function formatAvgBlockTimeMin(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} min`;
}

export function formatPercentChange(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

/** Share of total coin supply (e.g. richlist balance / chain supply). */
export function formatSupplySharePct(
  balance: number,
  totalSupply: number | null | undefined
): string | null {
  if (
    !Number.isFinite(balance) ||
    totalSupply == null ||
    !Number.isFinite(totalSupply) ||
    totalSupply <= 0
  ) {
    return null;
  }

  const pct = (balance / totalSupply) * 100;
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.01) return `${pct.toFixed(3)}%`;
  if (pct >= 0.0001) return `${pct.toFixed(4)}%`;
  return '<0.01%';
}

export function supplySharePercent(
  balance: number,
  totalSupply: number | null | undefined
): number | null {
  if (
    !Number.isFinite(balance) ||
    totalSupply == null ||
    !Number.isFinite(totalSupply) ||
    totalSupply <= 0
  ) {
    return null;
  }
  return Math.min(100, (balance / totalSupply) * 100);
}

export function hashPerSecToKhPerMin(hashPerSec: number): number {
  return (hashPerSec * 60) / 1000;
}
