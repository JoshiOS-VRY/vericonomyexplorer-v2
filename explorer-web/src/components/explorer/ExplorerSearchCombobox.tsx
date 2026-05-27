"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { searchChainClient } from "@/lib/api/client";
import type { IndexedBlock } from "@/lib/api/types";
import {
  classifySearchQuery,
  fallbackSuggestions,
  heightSuggestions,
  mergeSearchResults,
  recentBlockSuggestions,
  type SearchSuggestion,
} from "@/lib/searchSuggestions";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

export type RecentBlocksByChain = {
  vrm: IndexedBlock[];
  vrc: IndexedBlock[];
};

interface ExplorerSearchComboboxProps {
  variant?: "default" | "blockchair";
  recentBlocks?: RecentBlocksByChain;
  className?: string;
}

export function ExplorerSearchCombobox({
  variant = "default",
  recentBlocks,
  className,
}: ExplorerSearchComboboxProps) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [apiSuggestions, setApiSuggestions] = useState<SearchSuggestion[]>([]);

  const isBlockchair = variant === "blockchair";
  const trimmed = query.trim();
  const kind = classifySearchQuery(trimmed);

  const recentSuggestions = useMemo(() => {
    if (!recentBlocks || trimmed) return [];
    return [
      ...recentBlockSuggestions("vrm", recentBlocks.vrm),
      ...recentBlockSuggestions("vrc", recentBlocks.vrc),
    ];
  }, [recentBlocks, trimmed]);

  const instantSuggestions = useMemo(() => {
    if (!trimmed) return recentSuggestions;
    if (kind === "height") return heightSuggestions(trimmed);
    return [];
  }, [trimmed, kind, recentSuggestions]);

  const suggestions = useMemo(() => {
    if (!trimmed) return recentSuggestions;
    if (kind === "height") return heightSuggestions(trimmed);
    if (apiSuggestions.length > 0) return apiSuggestions;
    if (loading) return [];
    return fallbackSuggestions(trimmed, kind);
  }, [trimmed, kind, recentSuggestions, apiSuggestions, loading]);

  useEffect(() => {
    if (!trimmed || kind === "height") {
      setApiSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const [vrmPath, vrcPath] = await Promise.all([
          searchChainClient("vrm", trimmed),
          searchChainClient("vrc", trimmed),
        ]);
        if (cancelled) return;
        setApiSuggestions(mergeSearchResults(vrmPath, vrcPath, trimmed));
      } catch {
        if (!cancelled) {
          setApiSuggestions(fallbackSuggestions(trimmed, kind));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, kind]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery("");
      router.push(path);
    },
    [router],
  );

  const submitQuery = useCallback(() => {
    if (suggestions.length > 0) {
      const primary =
        suggestions.find((item) => item.primary) ?? suggestions[activeIndex] ?? suggestions[0];
      navigate(primary.path);
      return;
    }

    if (!trimmed) return;

    if (kind === "height") {
      navigate(`/vrm/block/${trimmed}`);
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const [vrmPath, vrcPath] = await Promise.all([
          searchChainClient("vrm", trimmed),
          searchChainClient("vrc", trimmed),
        ]);
        const merged = mergeSearchResults(vrmPath, vrcPath, trimmed);
        const target = merged.find((item) => item.primary) ?? merged[0];
        if (target) navigate(target.path);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeIndex, kind, navigate, suggestions, trimmed]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      submitQuery();
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && (suggestions.length > 0 || loading || (trimmed && kind !== "height"));

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div className={cn("flex gap-2", isBlockchair ? "flex-row" : "flex-col sm:flex-row")}>
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-subtle",
              isBlockchair ? "left-4 h-5 w-5" : "left-3 h-4 w-4",
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
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showDropdown ? true : false}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showDropdown && suggestions[activeIndex]
                ? `${listboxId}-${suggestions[activeIndex].id}`
                : undefined
            }
            placeholder={
              isBlockchair
                ? "Search by block height, hash, transaction ID, or address"
                : "Block height, hash, txid, or address"
            }
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "w-full rounded-lg border border-border bg-bg-panel text-sm outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/20",
              isBlockchair ? "h-11 pl-12 pr-10 shadow-sm" : "h-9 rounded-md bg-bg-subtle pl-10 pr-9",
            )}
          />
          {loading ? (
            <Loader2
              className={cn(
                "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg-subtle",
                isBlockchair ? "right-4" : "right-3",
              )}
              aria-hidden
            />
          ) : null}
        </label>
        <button
          type="button"
          onClick={submitQuery}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg bg-accent font-semibold text-accent-fg transition hover:bg-accent/90",
            isBlockchair ? "h-11 px-6 text-sm shadow-sm" : "h-9 rounded-md px-4 text-sm font-medium",
          )}
        >
          Search
        </button>
      </div>

      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          className="search-dropdown absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-border bg-bg-panel py-1 shadow-lg"
        >
          {!loading && suggestions.length === 0 && trimmed ? (
            <li className="px-4 py-3 text-sm text-fg-muted">No matches yet — try another query.</li>
          ) : null}

          {!trimmed && recentSuggestions.length > 0 ? (
            <li className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              Recent blocks
            </li>
          ) : null}

          {instantSuggestions.length > 0 && trimmed && kind === "height" ? (
            <li className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              Block height
            </li>
          ) : null}

          {suggestions.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === activeIndex}>
              <button
                id={`${listboxId}-${item.id}`}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                  index === activeIndex ? "bg-accent/10 text-fg" : "text-fg hover:bg-bg-subtle",
                  item.primary && "font-semibold",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigate(item.path)}
              >
                <span className="truncate">{item.label}</span>
                {item.sublabel ? (
                  <span className="shrink-0 text-xs text-fg-muted">{item.sublabel}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
