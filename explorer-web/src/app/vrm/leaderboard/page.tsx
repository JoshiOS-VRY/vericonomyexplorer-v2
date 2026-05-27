import Link from "next/link";
import {
  AlertBanner,
  DataTable,
  PageHero,
  PaginationLinks,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getLeaderboard } from "@/lib/api/indexer";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { normalizeLimit, normalizeOffset } from "@/lib/utils";

const filters = [
  { period: "week", sort: "net", label: "Week Net" },
  { period: "week", sort: "received", label: "Week Received" },
  { period: "week", sort: "activity", label: "Week Activity" },
  { period: "month", sort: "net", label: "Month Net" },
  { period: "month", sort: "received", label: "Month Received" },
  { period: "month", sort: "activity", label: "Month Activity" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    sort?: string;
    limit?: string;
    offset?: string;
  }>;
}) {
  const params = await searchParams;
  const period = params.period || "week";
  const sort = params.sort || "net";
  const limit = normalizeLimit(params.limit, 50);
  const offset = normalizeOffset(params.offset);

  let leaderboard;
  try {
    leaderboard = await getLeaderboard("vrm", { period, sort, limit, offset });
  } catch {
    return <AlertBanner title="Leaderboard Unavailable">Unable to load VRM leaderboard.</AlertBanner>;
  }

  if (!leaderboard.enabled && leaderboard.message) {
    return (
      <div className="space-y-6">
        <PageHero title="Verium Leaderboard" subtitle="Transfer activity by period." />
        <AlertBanner title="Leaderboard Disabled">{formatExplorerUserMessage(leaderboard.message)}</AlertBanner>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Verium Leaderboard"
        subtitle="Address transfer activity by period."
      />
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = leaderboard.period?.type === filter.period && leaderboard.sort === filter.sort;
          return (
            <Link
              key={filter.label}
              href={`/vrm/leaderboard?period=${filter.period}&sort=${filter.sort}`}
            >
              <Button variant={active ? "primary" : "secondary"} size="sm">
                {filter.label}
              </Button>
            </Link>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            headers={["Rank", "Address", "Received", "Sent", "Net", "Tx", "Last Seen"]}
            rows={leaderboard.items.map((item) => [
              `#${item.rank}`,
              <Link key="a" href={`/vrm/address/${item.address}`} className="font-mono text-xs text-accent hover:underline">{item.address}</Link>,
              `${item.received.amount} ${item.received.ticker}`,
              item.sent.amount,
              <span key="net" className={item.netAtomic.startsWith("-") ? "text-danger" : "text-success"}>{item.net.amount}</span>,
              formatHeight(item.txCount),
              item.lastSeenHeight != null ? (
                <Link key="ls" href={`/vrm/block/${item.lastSeenHeight}`}>{formatHeight(item.lastSeenHeight)}</Link>
              ) : "N/A",
            ])}
          />
          <PaginationLinks
            basePath="/vrm/leaderboard"
            paging={leaderboard.paging ?? { limit, offset, total: 0, hasMore: false }}
            extraParams={{ period, sort }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
