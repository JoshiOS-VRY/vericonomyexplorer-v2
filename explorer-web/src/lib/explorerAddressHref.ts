import type { ChainId } from '@/lib/chainDisplay';

export function parseAddressFromExplorerHref(
  href: string
): { chainId: ChainId; address: string } | null {
  for (const chainId of ['vrm', 'vrc'] as const) {
    const match = href.match(new RegExp(`^/${chainId}/address/([^/?#]+)`));
    if (match?.[1]) {
      return { chainId, address: decodeURIComponent(match[1]) };
    }
  }

  return null;
}
