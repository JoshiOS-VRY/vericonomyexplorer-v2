import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fixed locale so SSR and client hydration render identical number/date text. */
export const EXPLORER_LOCALE = "en-US";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function ellipsizeMiddle(value: string, maxLength = 24): string {
  if (!value || value.length <= maxLength) return value;
  const half = Math.floor((maxLength - 3) / 2);
  return `${value.slice(0, half)}...${value.slice(-half)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString(EXPLORER_LOCALE);
}

/** Compact coin balance for tables (e.g. 264.27K, 2.20M). */
export function formatCompactBalance(amount: string | number): string {
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(num)) {
    return typeof amount === "string" ? amount : "—";
  }

  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (abs >= 100) {
    return num.toLocaleString(EXPLORER_LOCALE, { maximumFractionDigits: 2 });
  }
  return num.toLocaleString(EXPLORER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

export function formatDifficulty(value: number | string | null | undefined): string {
  if (value == null || value === "") return "N/A";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return String(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) {
    return num.toLocaleString(EXPLORER_LOCALE, { maximumFractionDigits: 4 });
  }
  return num.toPrecision(4);
}

export function formatUnixTime(unixSeconds: number | null | undefined): string {
  if (unixSeconds == null || !Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return "—";
  }
  return new Date(unixSeconds * 1000).toLocaleString(EXPLORER_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBlockAge(unixSeconds: number | null | undefined): string {
  if (unixSeconds == null || !Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return "—";
  }
  const total = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds));
  if (total < 60) return `${total}s ago`;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s ago` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h ago` : `${days}d ago`;
}

export function normalizeLimit(value: string | number | undefined, defaultValue = 25): number {
  const limit = Number(value ?? defaultValue);
  if (!Number.isFinite(limit) || limit < 1) return defaultValue;
  return Math.min(Math.floor(limit), 100);
}

export function normalizeOffset(value: string | number | undefined): number {
  const offset = Number(value ?? 0);
  if (!Number.isFinite(offset) || offset < 0) return 0;
  return Math.floor(offset);
}
