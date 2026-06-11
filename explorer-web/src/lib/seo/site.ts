import { loadRootEnv } from '@/lib/env';

/** Production default when no public URL env is configured. */
export const DEFAULT_SITE_URL = 'https://explorer.vericonomy.com';

/** Submit this URL in Google Search Console → Sitemaps. */
export const SITEMAP_URL = `${DEFAULT_SITE_URL}/sitemap.xml`;

export const SITE_NAME = 'Vericonomy Explorer';

export const SITE_TAGLINE =
  "The official blockchain explorer for VeriCoin and Verium — the world's first binary blockchain protocol.";

export const SITE_DESCRIPTION =
  'Official Vericonomy block explorer for VeriCoin (VRC) and Verium (VRM). Search blocks, transactions, and wallet addresses; view rich lists, mining stats, network peers, and live Binary Chain data.';

export const SITE_KEYWORDS = [
  'Vericonomy',
  'Vericonomy explorer',
  'VeriCoin',
  'Vericoin',
  'Verium',
  'VeriumReserve',
  'VRC',
  'VRM',
  'binary blockchain',
  'Binary Chain explorer',
  'blockchain explorer',
  'block explorer',
  'Verium block explorer',
  'VeriCoin block explorer',
  'VRM explorer',
  'VRC explorer',
  'transaction lookup',
  'address lookup',
  'rich list',
  'Proof-of-Stake-Time',
  'Proof-of-Work-Time',
  'cryptocurrency explorer',
  'blockchain search',
  'how to look up Verium transaction',
  'VRM wallet balance',
];

/** Resolves the public origin used for canonical URLs, Open Graph, and sitemap. */
export function getSiteUrl(): string {
  loadRootEnv();
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.EXPLORER_SITE_URL ??
    process.env.BTCEXP_PUBLIC_URL;
  if (raw?.trim()) {
    return raw.trim().replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return DEFAULT_SITE_URL;
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Shorten long hex strings for titles and descriptions. */
export function shortenHex(value: string, head = 8, tail = 8): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
