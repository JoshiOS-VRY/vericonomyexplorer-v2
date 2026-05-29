import { FeatureTile } from "@/components/explorer/ExplorerUi";
import { CHAIN_EXPLORERS, type ChainId } from "@/lib/chainDisplay";

export function ChainQuickNav({
  chainId,
  tipBlockHref,
}: {
  chainId: ChainId;
  tipBlockHref: string | null;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const otherChain = chainId === "vrm" ? CHAIN_EXPLORERS.vrc : CHAIN_EXPLORERS.vrm;

  const tiles =
    chainId === "vrm"
      ? [
          {
            title: "Verium rich list",
            description: "Positive-balance VRM addresses ranked by balance.",
            href: "/vrm/richlist",
            hrefLabel: "View rich list",
          },
          {
            title: "Activity leaderboard",
            description: "Monthly transfer activity ranked by address.",
            href: "/vrm/leaderboard?period=month&sort=activity",
            hrefLabel: "View leaderboard",
          },
          {
            title: "Latest block",
            description: "Open the most recent block and its transactions.",
            href: tipBlockHref ?? "/vrm",
            hrefLabel: tipBlockHref ? "Open latest block" : "Explorer home",
          },
          {
            title: "API reference",
            description: "REST endpoints for integrations and automation.",
            href: "/api/docs",
            hrefLabel: "Read API docs",
          },
        ]
      : [
          {
            title: "VeriCoin rich list",
            description: "Positive-balance VRC addresses ranked by balance.",
            href: "/vrc/richlist",
            hrefLabel: "View rich list",
          },
          {
            title: `${otherChain.name} explorer`,
            description: `Blocks, transactions, and addresses on the ${otherChain.name} chain.`,
            href: otherChain.exploreHref ?? "/",
            hrefLabel: `Open ${otherChain.name}`,
          },
          {
            title: "Latest block",
            description: "Open the most recent block and its transactions.",
            href: tipBlockHref ?? "/vrc",
            hrefLabel: tipBlockHref ? "Open latest block" : "Explorer home",
          },
          {
            title: "API reference",
            description: "REST endpoints for integrations and automation.",
            href: "/api/docs",
            hrefLabel: "Read API docs",
          },
        ];

  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 ${chainId === "vrm" ? "lg:grid-cols-4" : "lg:grid-cols-4"}`}
    >
      {tiles.map((tile) => (
        <FeatureTile key={tile.title} {...tile} />
      ))}
    </div>
  );
}
