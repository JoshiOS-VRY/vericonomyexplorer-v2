import {
  AlertBanner,
  PaginationLinks,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { BcPageHeader, BcPanel } from "@/components/explorer/BlockchairUi";
import { getRichlist } from "@/lib/api/indexer";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { normalizeLimit, normalizeOffset } from "@/lib/utils";

export const revalidate = 60;

export default async function VrcRichlistPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const limit = normalizeLimit(params.limit, 50);
  const offset = normalizeOffset(params.offset);

  let richlist;
  try {
    richlist = await getRichlist("vrc", { limit, offset });
  } catch {
    return (
      <AlertBanner title="Richlist Unavailable">
        Unable to load VRC richlist.
      </AlertBanner>
    );
  }

  if (!richlist.enabled && richlist.message) {
    return (
      <div className="space-y-6">
        <BcPageHeader
          title="Rich list"
          subtitle="Top VRC addresses by balance."
        />
        <AlertBanner title="Richlist Unavailable">
          {formatExplorerUserMessage(richlist.message)}
        </AlertBanner>
      </div>
    );
  }

  const paging = richlist.paging ?? {
    limit,
    offset,
    total: richlist.items.length,
    hasMore: false,
  };
  const from = paging.offset + 1;
  const to = Math.min(paging.offset + paging.limit, paging.total);

  return (
    <div className="space-y-6">
      <BcPageHeader
        title="Rich list"
        subtitle={`Showing ${formatHeight(from)}–${formatHeight(to)} of ${formatHeight(paging.total)} addresses`}
      />

      <BcPanel title="Addresses" flush>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Received</th>
                <th className="text-right">Sent</th>
                <th className="text-right">Tx</th>
              </tr>
            </thead>
            <tbody>
              {richlist.items.map((item) => (
                <tr key={item.address}>
                  <td className="tabular-nums text-fg-subtle">{item.rank}</td>
                  <td>
                    <span className="text-sm break-all">{item.address}</span>
                  </td>
                  <td className="text-right font-medium tabular-nums">
                    {item.balance.amount} {item.balance.ticker}
                  </td>
                  <td className="text-right tabular-nums text-fg-muted">
                    {item.totalReceived.amount}
                  </td>
                  <td className="text-right tabular-nums text-fg-muted">
                    {item.totalSent.amount}
                  </td>
                  <td className="text-right tabular-nums text-fg-muted">
                    {formatHeight(item.txCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-5 py-4">
          <PaginationLinks basePath="/vrc/richlist" paging={paging} />
        </div>
      </BcPanel>
    </div>
  );
}
