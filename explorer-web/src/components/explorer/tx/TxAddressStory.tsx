import type { AddressEvent } from "@/lib/api/types";
import { ChainAddressLink } from "@/components/explorer/address/ChainAddressLink";
import { type ChainId } from "@/lib/chainDisplay";
import {
  addressEventRole,
  aggregateAddressEvents,
  type AggregatedAddressEvent,
} from "@/lib/txLabels";
import { cn, formatNumber } from "@/lib/utils";

const ADDRESS_ACTIVITY_COMPACT_RAW_THRESHOLD = 24;

function roleStyles(role: ReturnType<typeof addressEventRole>) {
  switch (role) {
    case "sender":
      return "border-danger/30 bg-danger/5";
    case "recipient":
      return "border-success/30 bg-success/5";
    default:
      return "border-border bg-bg-panel/60";
  }
}

function roleLabel(
  role: ReturnType<typeof addressEventRole>,
  eventType: string,
) {
  if (role === "sender") return "Sender";
  if (role === "recipient") return "Recipient";
  return eventType;
}

function AddressActivityCard({
  entry,
  chainId,
}: {
  entry: AggregatedAddressEvent;
  chainId: ChainId;
}) {
  const negative = entry.deltaAtomic.startsWith("-");

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        roleStyles(entry.role),
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <div className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
          {roleLabel(entry.role, entry.eventType)}
        </div>
        {entry.contributionCount > 1 ? (
          <div className="text-[10px] text-fg-subtle">
            {formatNumber(entry.contributionCount)}{" "}
            {entry.role === "sender"
              ? "inputs"
              : entry.role === "recipient"
                ? "outputs"
                : "entries"}
          </div>
        ) : null}
      </div>
      <div className="mt-1">
        <ChainAddressLink
          chainId={chainId}
          address={entry.address}
          maxLength={28}
          className="text-xs"
        />
      </div>
      <div
        className={cn(
          "mt-2 text-sm font-semibold tabular-nums",
          negative ? "text-danger" : "text-success",
        )}
      >
        {negative ? "" : "+"}
        {entry.delta.amount} {entry.delta.ticker}
      </div>
    </div>
  );
}

function AddressActivityGrid({
  entries,
  chainId,
}: {
  entries: AggregatedAddressEvent[];
  chainId: ChainId;
}) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <AddressActivityCard
          key={`${entry.address}-${entry.role}`}
          entry={entry}
          chainId={chainId}
        />
      ))}
    </div>
  );
}

export function TxAddressStory({
  events,
  chainId,
}: {
  events: AddressEvent[];
  chainId: ChainId;
}) {
  const aggregated = aggregateAddressEvents(events);
  const groupedSummary =
    events.length > aggregated.length
      ? `${formatNumber(events.length)} ledger entries grouped into ${formatNumber(aggregated.length)} address${aggregated.length === 1 ? "" : "es"}`
      : null;
  const useCompact = events.length >= ADDRESS_ACTIVITY_COMPACT_RAW_THRESHOLD;

  if (events.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          Address activity
        </h2>
        <p className="mt-2 text-sm text-fg-subtle">
          No address deltas recorded for this transaction.
        </p>
      </section>
    );
  }

  if (useCompact) {
    return (
      <details className="rounded-xl border border-border bg-bg-panel shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4">
          <span className="text-sm font-medium uppercase tracking-wide text-fg-muted">
            Address activity
          </span>
          {groupedSummary ? (
            <p className="mt-1 text-sm text-fg-subtle">{groupedSummary}</p>
          ) : (
            <p className="mt-1 text-sm text-fg-subtle">
              {formatNumber(aggregated.length)} address
              {aggregated.length === 1 ? "" : "es"} with net balance change
            </p>
          )}
          <span className="mt-1 block text-xs text-fg-subtle">(expand)</span>
        </summary>
        <div className="border-t border-border">
          <AddressActivityGrid entries={aggregated} chainId={chainId} />
        </div>
      </details>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          Address activity
        </h2>
        {groupedSummary ? (
          <p className="mt-1 text-sm text-fg-subtle">{groupedSummary}</p>
        ) : null}
      </div>
      <AddressActivityGrid entries={aggregated} chainId={chainId} />
    </section>
  );
}
