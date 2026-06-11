'use client';

import { Box, Coins, Hash, Loader2, Wallet, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { searchChainClient } from '@/lib/api/client';
import type { IndexedBlock } from '@/lib/api/types';
import { CHAIN_EXPLORERS, CHAIN_THEME } from '@/lib/chainDisplay';
import {
  classifySearchQuery,
  fallbackSuggestions,
  heightSuggestions,
  mergeSearchResults,
  recentBlockSuggestions,
  sanitizeSearchQuery,
  type SearchEntityType,
  type SearchSuggestion,
} from '@/lib/searchSuggestions';
import {
  clearSearchHistory,
  loadSearchHistory,
  recordSearch,
  type SearchHistoryEntry,
} from '@/lib/searchHistory';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 250;

export type RecentBlocksByChain = {
  vrm: IndexedBlock[];
  vrc: IndexedBlock[];
};

interface ExplorerSearchComboboxProps {
  variant?: 'default' | 'blockchair';
  recentBlocks?: RecentBlocksByChain;
  className?: string;
}

const entityIcons: Record<SearchEntityType, typeof Box> = {
  block: Box,
  tx: Hash,
  address: Wallet,
};

function ChainBadge({ chainId }: { chainId: 'vrm' | 'vrc' }) {
  const theme = CHAIN_THEME[chainId];
  const chain = CHAIN_EXPLORERS[chainId];

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: theme.accentSoft,
        color: theme.accent,
      }}
    >
      <Coins className="h-3 w-3" aria-hidden />
      {chain.ticker}
    </span>
  );
}

function SearchSkeletonRows() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, index) => (
        <li key={index} className="px-4 py-2.5">
          <div className="h-4 animate-pulse rounded bg-bg-subtle" />
        </li>
      ))}
    </>
  );
}

export function ExplorerSearchCombobox({
  variant = 'default',
  recentBlocks,
  className,
}: ExplorerSearchComboboxProps) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [apiSuggestions, setApiSuggestions] = useState<SearchSuggestion[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);

  const isBlockchair = variant === 'blockchair';
  const trimmed = sanitizeSearchQuery(query);
  const kind = classifySearchQuery(trimmed);

  useEffect(() => {
    setHistory(loadSearchHistory());
  }, []);

  const historySuggestions = useMemo<SearchSuggestion[]>(() => {
    if (trimmed) return [];
    return history.map((entry) => ({
      id: `history-${entry.path}`,
      label: entry.label,
      sublabel: 'recent search',
      path: entry.path,
      chainId: entry.chainId,
      entityType: entry.entityType,
    }));
  }, [history, trimmed]);

  const recentSuggestions = useMemo(() => {
    if (trimmed) return [];
    if (historySuggestions.length > 0) return historySuggestions;
    if (!recentBlocks) return [];
    return [
      ...recentBlockSuggestions('vrm', recentBlocks.vrm),
      ...recentBlockSuggestions('vrc', recentBlocks.vrc),
    ];
  }, [historySuggestions, recentBlocks, trimmed]);

  const suggestions = useMemo(() => {
    if (!trimmed) return recentSuggestions;
    if (kind === 'height') {
      if (apiSuggestions.length > 0) return apiSuggestions;
      if (loading || !lookupDone) return heightSuggestions(trimmed);
      return [];
    }
    if (apiSuggestions.length > 0) return apiSuggestions;
    if (loading || !lookupDone) return [];
    return fallbackSuggestions(trimmed, kind);
  }, [trimmed, kind, recentSuggestions, apiSuggestions, loading, lookupDone]);

  const suggestionsKey = useMemo(
    () =>
      suggestions.map((item) => `${item.chainId}:${item.path}:${item.primary ? 1 : 0}`).join('|'),
    [suggestions]
  );

  const showHeightHint = trimmed && kind === 'height' && suggestions.length > 1;

  useEffect(() => {
    if (!trimmed) {
      setApiSuggestions([]);
      setLoading(false);
      setLookupDone(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLookupDone(false);
    setSubmitError(null);

    const timer = window.setTimeout(async () => {
      try {
        const [vrmPath, vrcPath] = await Promise.all([
          searchChainClient('vrm', trimmed),
          searchChainClient('vrc', trimmed),
        ]);
        if (cancelled) return;
        setApiSuggestions(mergeSearchResults(vrmPath, vrcPath, trimmed));
      } catch {
        if (!cancelled) {
          setApiSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLookupDone(true);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, kind]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestionsKey]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // Global "/" (or Ctrl/Cmd+K) shortcut focuses the search input, the way most
  // explorers do. Ignored while typing in another field.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      const isCmdK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      if ((isSlash && !typingElsewhere) || isCmdK) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const navigate = useCallback(
    (target: string | SearchSuggestion) => {
      const suggestion = typeof target === 'string' ? null : target;
      const path = typeof target === 'string' ? target : target.path;
      setOpen(false);
      setQuery('');
      setSubmitError(null);
      // Persist confirmed, non-tentative lookups as recent searches.
      if (suggestion && !suggestion.tentative && !suggestion.id.startsWith('history-')) {
        setHistory(
          recordSearch({
            query: suggestion.label,
            label: suggestion.label,
            path: suggestion.path,
            chainId: suggestion.chainId,
            entityType: suggestion.entityType,
          })
        );
      }
      router.push(path);
    },
    [router]
  );

  const onClearHistory = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  const resolveTarget = useCallback(async (): Promise<SearchSuggestion | null> => {
    if (suggestions.length > 0) {
      return suggestions.find((item) => item.primary) ?? suggestions[activeIndex] ?? suggestions[0];
    }

    if (!trimmed) return null;

    if (kind === 'height') {
      return heightSuggestions(trimmed)[activeIndex] ?? heightSuggestions(trimmed)[0] ?? null;
    }

    setLoading(true);
    setSubmitError(null);
    try {
      const [vrmPath, vrcPath] = await Promise.all([
        searchChainClient('vrm', trimmed),
        searchChainClient('vrc', trimmed),
      ]);
      const merged = mergeSearchResults(vrmPath, vrcPath, trimmed);
      if (merged.length > 0) {
        return merged.find((item) => item.primary) ?? merged[0];
      }
      const fallbacks = fallbackSuggestions(trimmed, kind);
      return fallbacks[0] ?? null;
    } finally {
      setLoading(false);
      setLookupDone(true);
    }
  }, [activeIndex, kind, suggestions, trimmed]);

  const submitQuery = useCallback(() => {
    void (async () => {
      const target = await resolveTarget();
      if (target) {
        navigate(target);
        return;
      }

      setSubmitError(
        'No block, transaction, or address found on Verium or VeriCoin. Check the query and try again.'
      );
      setOpen(true);
    })();
  }, [navigate, resolveTarget]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submitQuery();
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setSubmitError(null);
      inputRef.current?.blur();
    }
  };

  const showDropdown = Boolean(
    open &&
      (suggestions.length > 0 ||
        loading ||
        submitError != null ||
        (trimmed && kind !== 'height' && lookupDone && suggestions.length === 0) ||
        (trimmed && kind === 'height'))
  );

  const showEmptyState =
    trimmed && !loading && lookupDone && suggestions.length === 0 && kind !== 'height';

  const showRecentHeader = !trimmed && recentSuggestions.length > 0;
  const showHeightHeader = trimmed && kind === 'height' && suggestions.length > 0;

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <div className={cn('flex gap-2', isBlockchair ? 'flex-row' : 'flex-col sm:flex-row')}>
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <svg
            viewBox="0 0 24 24"
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-subtle',
              isBlockchair ? 'left-4 h-5 w-5' : 'left-3 h-4 w-4'
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(sanitizeSearchQuery(event.target.value));
              setOpen(true);
              setSubmitError(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showDropdown && suggestions[activeIndex]
                ? `${listboxId}-${suggestions[activeIndex].id}`
                : undefined
            }
            placeholder={
              isBlockchair
                ? 'Search by block height, hash, transaction ID, or address'
                : 'Block height, hash, txid, or address'
            }
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'w-full rounded-lg border border-border bg-bg-panel text-sm outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/20',
              isBlockchair
                ? 'h-11 pl-12 pr-10 shadow-sm'
                : 'h-9 rounded-md bg-bg-subtle pl-10 pr-9',
              submitError && 'border-danger/50 focus:border-danger focus:ring-danger/20'
            )}
          />
          {loading ? (
            <Loader2
              className={cn(
                'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg-subtle',
                isBlockchair ? 'right-4' : 'right-3'
              )}
              aria-hidden
            />
          ) : query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setSubmitError(null);
                setApiSuggestions([]);
                setLookupDone(false);
                inputRef.current?.focus();
              }}
              className={cn(
                'absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg',
                isBlockchair ? 'right-3.5' : 'right-2.5'
              )}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </label>
        <button
          type="button"
          onClick={submitQuery}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-lg bg-accent font-semibold text-accent-fg transition hover:bg-accent/90',
            isBlockchair ? 'h-11 px-6 text-sm shadow-sm' : 'h-9 rounded-md px-4 text-sm font-medium'
          )}
        >
          Search
        </button>
      </div>

      {showHeightHint ? (
        <p className="mt-1.5 text-xs text-fg-muted">
          Press ↑↓ to choose a chain, then Enter to open the block.
        </p>
      ) : null}

      {submitError && !showDropdown ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {submitError}
        </p>
      ) : null}

      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          className="search-dropdown absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-border bg-bg-panel py-1 shadow-lg"
        >
          {submitError ? (
            <li
              className="search-dropdown-section border-b border-border/80 px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {submitError}
            </li>
          ) : null}

          {loading && suggestions.length === 0 ? <SearchSkeletonRows /> : null}

          {showEmptyState ? (
            <li className="search-dropdown-section px-4 py-3 text-sm text-fg-muted">
              <p>No matches on Verium or VeriCoin.</p>
              <p className="mt-1 text-xs text-fg-subtle">
                Examples: block height <span className="font-mono">12345</span>, 64-character hash,
                or wallet address.
              </p>
            </li>
          ) : null}

          {showRecentHeader ? (
            <li className="search-dropdown-section flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              <span>{historySuggestions.length > 0 ? 'Recent searches' : 'Recent blocks'}</span>
              {historySuggestions.length > 0 ? (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="font-medium normal-case tracking-normal text-fg-subtle transition-colors hover:text-fg"
                >
                  Clear
                </button>
              ) : null}
            </li>
          ) : null}

          {showHeightHeader ? (
            <li className="search-dropdown-section px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              Block height
            </li>
          ) : null}

          {suggestions.map((item, index) => {
            const Icon = entityIcons[item.entityType];

            return (
              <li key={item.id} role="presentation">
                <button
                  id={`${listboxId}-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                    index === activeIndex ? 'bg-accent/10 text-fg' : 'text-fg hover:bg-bg-subtle',
                    item.primary && 'font-semibold'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigate(item)}
                >
                  <Icon className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {item.tentative ? (
                      <span className="text-[10px] text-fg-subtle">Try</span>
                    ) : null}
                    <ChainBadge chainId={item.chainId} />
                    {item.sublabel && !item.tentative ? (
                      <span className="hidden text-xs text-fg-muted sm:inline">
                        {item.sublabel}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
