import { cn } from "@/lib/utils";

export function SearchForm({
  action = "/vrm/search",
  variant = "default",
}: {
  action?: string;
  variant?: "default" | "blockchair";
}) {
  const isBlockchair = variant === "blockchair";

  return (
    <form action={action} method="post" className="w-full">
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
            type="text"
            name="query"
            placeholder={
              isBlockchair
                ? "Search by block height, hash, transaction ID, or address"
                : "Block height, hash, txid, or address"
            }
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "w-full rounded-lg border border-border bg-bg-panel text-sm outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/20",
              isBlockchair ? "h-11 pl-12 pr-4 shadow-sm" : "h-9 rounded-md bg-bg-subtle pl-10 pr-4",
            )}
          />
        </label>
        <button
          type="submit"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg bg-accent font-semibold text-accent-fg transition hover:bg-accent/90",
            isBlockchair ? "h-11 px-6 text-sm shadow-sm" : "h-9 rounded-md px-4 text-sm font-medium",
          )}
        >
          Search
        </button>
      </div>
    </form>
  );
}
