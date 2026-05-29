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
import { getMinersLeaderboard } from "@/lib/api/indexer";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { normalizeLimit, normalizeOffset } from "@/lib/utils";

const PERIODS = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "Past year" },
  { id: "all", label: "All time" },
] as const;

export default async function MinersPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    limit?: string;
    offset?: string;
  }>;
}) {
  const params = await searchParams;
  const period = params.period || "month";
  const limit = normalizeLimit(params.limit, 50);
  const offset = normalizeOffset(params.offset);

  let miners;
  try {
    miners = await getMinersLeaderboard("vrm", { period, limit, offset });
  } catch {
    return (
      <AlertBanner title="Miners Unavailable">
        Unable to load VRM top miners.
      </AlertBanner>
    );
  }

  if (!miners.enabled && miners.message) {
    return (
      <div className="space-y-6">
        <PageHero
          title="Verium Top Miners"
          subtitle="Addresses ranked by coinbase rewards earned."
        />
        <AlertBanner title="Miners Disabled">
          {formatExplorerUserMessage(miners.message)}
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Verium Top Miners"
        subtitle="Addresses ranked by VRM earned from block rewards in the selected period."
      />
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((option) => {
          const active = miners.period?.type === option.id;
          return (
            <Link key={option.id} href={`/vrm/miners?period=${option.id}`}>
              <Button variant={active ? "primary" : "secondary"} size="sm">
                {option.label}
              </Button>
            </Link>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Mined VRM</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Rank", "Address", "Mined", "Blocks", "Last block"]}
            rows={miners.items.map((item) => [
              `#${item.rank}`,
              <Link
                key="a"
                href={`/vrm/address/${item.address}`}
                className="text-xs text-accent hover:underline"
              >
                {item.address}
              </Link>,
              `${item.mined.amount} ${item.mined.ticker}`,
              formatHeight(item.blockCount),
              item.lastMinedHeight != null ? (
                <Link key="lb" href={`/vrm/block/${item.lastMinedHeight}`}>
                  {formatHeight(item.lastMinedHeight)}
                </Link>
              ) : (
                "N/A"
              ),
            ])}
          />
          <PaginationLinks
            basePath="/vrm/miners"
            paging={miners.paging ?? { limit, offset, total: 0, hasMore: false }}
            extraParams={{ period }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
