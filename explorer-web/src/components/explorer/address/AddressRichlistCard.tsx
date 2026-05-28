import Link from "next/link";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import type { AddressRichlistInfo } from "@/lib/api/types";

export function AddressRichlistCard({
  richlist,
  address,
}: {
  richlist: AddressRichlistInfo;
  address: string;
}) {
  if (!richlist.enabled) {
    return (
      <BcPanel title="Rich list">
        <p className="text-sm text-fg-muted">
          Rich list is unavailable until blocks are available.
        </p>
      </BcPanel>
    );
  }

  if (!richlist.eligible || richlist.rank == null) {
    return (
      <BcPanel title="Rich list">
        <p className="text-sm text-fg-muted">
          This address has no positive balance and is not ranked on the rich
          list.
        </p>
        <Link
          href="/vrm/richlist"
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          Browse rich list
        </Link>
      </BcPanel>
    );
  }

  const offset = Math.max(richlist.rank - 1, 0);
  const topPercent =
    richlist.percentile != null
      ? Math.max(1, Math.ceil(richlist.percentile * 100))
      : null;

  return (
    <BcPanel title="Rich list rank">
      <div className="space-y-4">
        <div>
          <div className="text-3xl font-bold tabular-nums tracking-tight text-fg">
            #{formatHeight(richlist.rank)}
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            of {formatHeight(richlist.total)} addresses with a positive balance
            {topPercent != null ? ` · top ${topPercent}%` : ""}
          </p>
        </div>
        <Link
          href={`/vrm/richlist?offset=${offset}&limit=50`}
          className="inline-flex items-center rounded-md border border-border bg-bg-subtle px-3 py-1.5 text-sm font-medium text-fg transition hover:border-border-strong hover:bg-bg-muted"
        >
          View on rich list
        </Link>
        <p className="text-xs text-fg-subtle break-all">{address}</p>
      </div>
    </BcPanel>
  );
}
