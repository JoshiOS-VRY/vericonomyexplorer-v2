import { formatHeight } from "@/components/explorer/ExplorerUi";
import type { IndexedBlock } from "@/lib/api/types";

export function VrmNewBlockToast({ block }: { block: IndexedBlock }) {
  return (
    <div className="live-toast pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-accent/25 bg-bg-panel px-4 py-3 shadow-lg">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">New block mined</p>
        <p className="font-mono text-sm font-bold tabular-nums text-fg">#{formatHeight(block.height)}</p>
      </div>
    </div>
  );
}
