import type { Metadata } from "next";
import { CHAIN_EXPLORERS, type ChainId } from "@/lib/chainDisplay";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/seo/site";

export type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  /** When true, omit from indexing (admin, tools, etc.). */
  noIndex?: boolean;
  /** Override default OG/Twitter image path (relative to site origin). */
  imagePath?: string;
};

function sharedOpenGraph(
  title: string,
  description: string,
  path: string,
  imagePath = "/opengraph-image",
): Metadata["openGraph"] {
  const siteUrl = getSiteUrl();
  return {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title,
    description,
    url: `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`,
    images: [
      {
        url: imagePath.startsWith("http") ? imagePath : `${siteUrl}${imagePath}`,
        alt: SITE_NAME,
      },
    ],
  };
}

function sharedTwitter(title: string, description: string, imagePath = "/opengraph-image"): Metadata["twitter"] {
  const siteUrl = getSiteUrl();
  return {
    card: "summary_large_image",
    title,
    description,
    images: [imagePath.startsWith("http") ? imagePath : `${siteUrl}${imagePath}`],
  };
}

/** Builds page-level metadata with canonical URL, Open Graph, and Twitter cards. */
export function pageMetadata(input: PageSeoInput): Metadata {
  const { title, description, path, noIndex, imagePath } = input;
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const isHome = canonical === "/";

  return {
    title: isHome ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: sharedOpenGraph(title, description, canonical, imagePath),
    twitter: sharedTwitter(title, description, imagePath),
    ...(noIndex
      ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
      : {}),
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: "Vericonomy", url: "https://vericonomy.com" }],
  creator: "Vericonomy",
  publisher: "Vericonomy",
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export function chainSectionMetadata(chainId: ChainId): Metadata {
  const chain = CHAIN_EXPLORERS[chainId];
  const path = chain.exploreHref ?? `/${chainId}`;
  return pageMetadata({
    title: `${chain.name} (${chain.ticker}) Explorer`,
    description: `Live ${chain.name} (${chain.ticker}) blockchain data — latest blocks, transactions, network health, and ${chain.consensus} metrics.`,
    path,
  });
}

export const staticPageSeo: Record<string, PageSeoInput> = {
  home: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: "/",
  },
  insights: {
    title: "Network Insights",
    description:
      "Charts and historical metrics for VeriCoin and Verium — supply, activity, difficulty, and market context.",
    path: "/insights",
  },
  search: {
    title: "Search",
    description:
      "Search VeriCoin and Verium blocks, transactions, and addresses by height, hash, txid, or wallet address.",
    path: "/search",
  },
  about: {
    title: "About",
    description:
      "About Vericonomy Explorer — a self-hosted blockchain explorer for the VeriCoin and Verium binary chain protocol.",
    path: "/about",
  },
  blocks: {
    title: "Blocks",
    description: "Browse recent blocks indexed by the Vericonomy explorer.",
    path: "/blocks",
  },
  apiDocs: {
    title: "API Reference",
    description:
      "REST API documentation for Vericonomy Explorer — chain summaries, blocks, transactions, addresses, and indexer health.",
    path: "/api/docs",
  },
  vrmRichlist: {
    title: "Verium Rich List",
    description: "Top Verium (VRM) addresses ranked by on-chain balance.",
    path: "/vrm/richlist",
  },
  vrcRichlist: {
    title: "VeriCoin Rich List",
    description: "Top VeriCoin (VRC) addresses ranked by on-chain balance.",
    path: "/vrc/richlist",
  },
  vrmLeaderboard: {
    title: "Verium Activity Leaderboard",
    description: "Verium address activity leaderboard by transfer volume and period.",
    path: "/vrm/leaderboard",
  },
  vrmMiners: {
    title: "Verium Miners",
    description: "Verium mining pool and miner statistics from indexed blocks.",
    path: "/vrm/miners",
  },
  vrmPeers: {
    title: "Verium Peers",
    description: "Network peers connected to the Verium node backing this explorer.",
    path: "/vrm/peers",
  },
  vrcPeers: {
    title: "VeriCoin Peers",
    description: "Network peers connected to the VeriCoin node backing this explorer.",
    path: "/vrc/peers",
  },
};
