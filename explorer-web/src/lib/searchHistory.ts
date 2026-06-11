import type { SearchEntityType } from '@/lib/searchSuggestions';

export type SearchHistoryEntry = {
  query: string;
  label: string;
  path: string;
  chainId: 'vrm' | 'vrc';
  entityType: SearchEntityType;
  ts: number;
};

export const SEARCH_HISTORY_KEY = 'vericonomy.search.history';
export const SEARCH_HISTORY_MAX = 6;

/**
 * Pure merge: prepend `entry`, drop any earlier entry for the same path, and cap
 * the list. Extracted from storage so it can be unit-tested deterministically.
 */
export function mergeHistoryEntry(
  list: SearchHistoryEntry[],
  entry: SearchHistoryEntry,
  max: number = SEARCH_HISTORY_MAX
): SearchHistoryEntry[] {
  const deduped = list.filter((item) => item.path !== entry.path);
  return [entry, ...deduped].slice(0, Math.max(0, max));
}

function isValidEntry(value: unknown): value is SearchHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.path === 'string' &&
    typeof entry.label === 'string' &&
    (entry.chainId === 'vrm' || entry.chainId === 'vrc') &&
    (entry.entityType === 'block' || entry.entityType === 'tx' || entry.entityType === 'address')
  );
}

/** Parse a raw localStorage payload into validated entries (tolerant of junk). */
export function parseSearchHistory(raw: string | null): SearchHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry).slice(0, SEARCH_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function loadSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseSearchHistory(window.localStorage.getItem(SEARCH_HISTORY_KEY));
  } catch {
    return [];
  }
}

export function recordSearch(
  entry: Omit<SearchHistoryEntry, 'ts'> & { ts?: number }
): SearchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const next = mergeHistoryEntry(loadSearchHistory(), {
    ...entry,
    ts: entry.ts ?? Date.now(),
  });
  try {
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode / quota); history is best-effort.
  }
  return next;
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // ignore
  }
}
