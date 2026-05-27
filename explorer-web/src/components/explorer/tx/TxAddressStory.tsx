import Link from "next/link";
import type { AddressEvent } from "@/lib/api/types";
import { addressEventRole } from "@/lib/txLabels";
import { cn, ellipsizeMiddle } from "@/lib/utils";

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

function roleLabel(role: ReturnType<typeof addressEventRole>, eventType: string) {
  if (role === "sender") return "Sender";
  if (role === "recipient") return "Recipient";
  return eventType;
}

export function TxAddressStory({ events }: { events: AddressEvent[] }) {
  if (events.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Address activity</h2>
        <p className="mt-2 text-sm text-fg-subtle">No address deltas recorded for this transaction.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Address activity</h2>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const role = addressEventRole(event);
          const negative = event.deltaAtomic.startsWith("-");

          return (
            <div
              key={`${event.address}-${event.eventType}-${event.deltaAtomic}`}
              className={cn("rounded-lg border px-4 py-3", roleStyles(role))}
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
                {roleLabel(role, event.eventType)}
              </div>
              <Link
                href={`/vrm/address/${event.address}`}
                className="mt-1 block font-mono text-xs text-accent hover:underline"
              >
                {ellipsizeMiddle(event.address, 28)}
              </Link>
              <div
                className={cn(
                  "mt-2 font-mono text-sm font-semibold tabular-nums",
                  negative ? "text-danger" : "text-success",
                )}
              >
                {negative ? "" : "+"}
                {event.delta.amount} {event.delta.ticker}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
