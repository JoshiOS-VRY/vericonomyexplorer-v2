import type { Metadata } from 'next';
import { CHAIN_EXPLORERS, type ChainId } from '@/lib/chainDisplay';
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from '@/lib/seo/site';

export type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  /** When true, omit from indexing (admin, tools, etc.). */
  noIndex?: boolean;
  /** Override default OG/Twitter image path (relative to site origin). */
  imagePath?: string;
};

function sharedOpenGraph(
  title: string,
  description: string,
  path: string,
  imagePath = '/opengraph-image'
): Metadata['openGraph'] {
  const siteUrl = getSiteUrl();
  return {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    title,
    description,
    url: `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`,
    images: [
      {
        url: imagePath.startsWith('http') ? imagePath : `${siteUrl}${imagePath}`,
        alt: SITE_NAME,
      },
    ],
  };
}

function sharedTwitter(
  title: string,
  description: string,
  imagePath = '/opengraph-image'
): Metadata['twitter'] {
  const siteUrl = getSiteUrl();
  return {
    card: 'summary_large_image',
    title,
    description,
    images: [imagePath.startsWith('http') ? imagePath : `${siteUrl}${imagePath}`],
  };
}

/** Builds page-level metadata with canonical URL, Open Graph, and Twitter cards. */
export function pageMetadata(input: PageSeoInput): Metadata {
  const { title, description, path, noIndex, imagePath, keywords = [] } = input;
  const canonical = path.startsWith('/') ? path : `/${path}`;
  const isHome = canonical === '/';

  return {
    title: isHome ? { absolute: title } : title,
    description,
    keywords: [...SITE_KEYWORDS, ...keywords],
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
  authors: [{ name: 'Vericonomy', url: 'https://vericonomy.com' }],
  creator: 'Vericonomy',
  publisher: 'Vericonomy',
  category: 'technology',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  icons: {
    icon: [{ url: '/img/vericonomy/vericonomylogo.png', type: 'image/png' }],
    apple: [{ url: '/img/vericonomy/vericonomylogo.png', type: 'image/png' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export function chainSectionMetadata(chainId: ChainId): Metadata {
  const chain = CHAIN_EXPLORERS[chainId];
  const path = chain.exploreHref ?? `/${chainId}`;
  const extraKeywords =
    chainId === 'vrm'
      ? ['Verium blockchain', 'VRM chain data', 'scrypt2 network', 'VeriumReserve explorer']
      : ['VeriCoin blockchain', 'VRC chain data', 'PoST network', 'Vericoin explorer'];
  return pageMetadata({
    title: `${chain.name} (${chain.ticker}) Explorer`,
    description: `Live ${chain.name} (${chain.ticker}) blockchain explorer — latest blocks, transactions, addresses, rich lists, and ${chain.consensus} network metrics on the Binary Chain.`,
    path,
    keywords: extraKeywords,
  });
}

export const staticPageSeo: Record<string, PageSeoInput> = {
  home: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: '/',
    keywords: ['official Verium explorer', 'official VeriCoin explorer', 'live blockchain data'],
  },
  insights: {
    title: 'Network Insights',
    description:
      'Charts and historical metrics for VeriCoin and Verium — supply, activity, difficulty, hashrate, and market context on the Binary Chain.',
    path: '/insights',
    keywords: ['network statistics', 'blockchain charts', 'VRM metrics', 'VRC metrics'],
  },
  search: {
    title: 'Search',
    description:
      'Search VeriCoin and Verium blocks, transactions, and addresses by block height, hash, txid, or wallet address on the official Vericonomy explorer.',
    path: '/search',
    keywords: ['blockchain search', 'transaction search', 'address search', 'block height lookup'],
  },
  about: {
    title: 'About',
    description:
      'About Vericonomy Explorer — the official self-hosted blockchain explorer for the VeriCoin and Verium Binary Chain protocol.',
    path: '/about',
    keywords: ['about Vericonomy explorer', 'Binary Chain explorer', 'official block explorer'],
  },
  blocks: {
    title: 'Blocks',
    description: 'Browse recent VeriCoin and Verium blocks indexed by the Vericonomy explorer.',
    path: '/blocks',
    keywords: ['recent blocks', 'block list', 'VRM blocks', 'VRC blocks'],
  },
  apiDocs: {
    title: 'API Reference',
    description:
      'REST API documentation for Vericonomy Explorer — chain summaries, blocks, transactions, addresses, rich lists, and indexer health endpoints.',
    path: '/api/docs',
    keywords: ['blockchain API', 'explorer API', 'Verium API', 'indexer API', 'developer reference'],
  },
  vrmRichlist: {
    title: 'Verium Rich List',
    description:
      'Top Verium (VRM) addresses ranked by on-chain balance — wealth distribution on the Binary Chain reserve layer.',
    path: '/vrm/richlist',
    keywords: ['VRM rich list', 'Verium whales', 'top VRM addresses', 'VRM balance ranking'],
  },
  vrcRichlist: {
    title: 'VeriCoin Rich List',
    description:
      'Top VeriCoin (VRC) addresses ranked by on-chain balance — largest VRC holders on the Binary Chain.',
    path: '/vrc/richlist',
    keywords: ['VRC rich list', 'VeriCoin whales', 'top VRC addresses', 'VRC balance ranking'],
  },
  vrmLeaderboard: {
    title: 'Verium Activity Leaderboard',
    description:
      'Verium (VRM) address activity leaderboard ranked by transfer volume over selectable time periods.',
    path: '/vrm/leaderboard',
    keywords: ['VRM activity', 'Verium transfers', 'address leaderboard', 'on-chain activity'],
  },
  vrmMiners: {
    title: 'Verium Miners',
    description:
      'Verium (VRM) mining statistics from indexed blocks — pool share, miner activity, and block finders.',
    path: '/vrm/miners',
    keywords: ['Verium miners', 'VRM mining stats', 'block finders', 'mining activity'],
  },
  vrmPeers: {
    title: 'Verium Peers',
    description:
      'Network peers connected to the Verium node backing this explorer — P2P connectivity and sync health.',
    path: '/vrm/peers',
    keywords: ['Verium network peers', 'VRM node peers', 'P2P network'],
  },
  vrcPeers: {
    title: 'VeriCoin Peers',
    description:
      'Network peers connected to the VeriCoin node backing this explorer — P2P connectivity and sync health.',
    path: '/vrc/peers',
    keywords: ['VeriCoin network peers', 'VRC node peers', 'P2P network'],
  },
};
