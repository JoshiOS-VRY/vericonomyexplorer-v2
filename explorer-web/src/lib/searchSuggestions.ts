export type SearchQueryKind = 'height' | 'hash' | 'address' | 'unknown';

export type SearchEntityType = 'block' | 'tx' | 'address';

/** Strip formatting copied from UI stats (commas, spaces, labels, tickers). */
export function sanitizeSearchQuery(raw: string): string {
  let value = raw.trim();
  value = value.replace(/,/g, '').replace(/\s+/g, '');
  value = value.replace(/^(balance|received|sent|transactions)/i, '');
  value = value.replace(/^(\d+(?:\.\d+)?)(?:VRC|VRM)$/i, '$1');
  return value;
}

export function classifySearchQuery(query: string): SearchQueryKind {
  const trimmed = sanitizeSearchQuery(query);
  if (!trimmed) return 'unknown';
  if (/^\d+$/.test(trimmed)) return 'height';
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return 'hash';
  return 'address';
}

export function entityTypeFromPath(path: string): SearchEntityType {
  if (path.includes('/tx/')) return 'tx';
  if (path.includes('/block/')) return 'block';
  return 'address';
}

export type SearchSuggestion = {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  chainId: 'vrm' | 'vrc';
  entityType: SearchEntityType;
  primary?: boolean;
  tentative?: boolean;
};

export function heightSuggestions(height: string): SearchSuggestion[] {
  return (['vrm', 'vrc'] as const).map((chainId) => ({
    id: `${chainId}-block-${height}`,
    label: `Block #${height}`,
    sublabel: chainId.toUpperCase(),
    path: `/${chainId}/block/${height}`,
    chainId,
    entityType: 'block' as const,
  }));
}

export function fallbackSuggestions(query: string, kind: SearchQueryKind): SearchSuggestion[] {
  const trimmed = sanitizeSearchQuery(query);
  if (!trimmed) return [];

  return (['vrm', 'vrc'] as const).map((chainId) => {
    if (kind === 'height') {
      return {
        id: `${chainId}-block-${trimmed}`,
        label: `Block #${trimmed}`,
        sublabel: `${chainId.toUpperCase()} · try`,
        path: `/${chainId}/block/${trimmed}`,
        chainId,
        entityType: 'block' as const,
        tentative: true,
      };
    }
    if (kind === 'hash') {
      return {
        id: `${chainId}-hash-${trimmed}`,
        label: 'Search hash',
        sublabel: `${chainId.toUpperCase()} · tx or block`,
        path: `/${chainId}/tx/${trimmed}`,
        chainId,
        entityType: 'tx' as const,
        tentative: true,
      };
    }
    return {
      id: `${chainId}-addr-${trimmed}`,
      label: trimmed.length > 20 ? `${trimmed.slice(0, 10)}…${trimmed.slice(-6)}` : trimmed,
      sublabel: `${chainId.toUpperCase()} address · try`,
      path: `/${chainId}/address/${encodeURIComponent(trimmed)}`,
      chainId,
      entityType: 'address' as const,
      tentative: true,
    };
  });
}

export function recentBlockSuggestions(
  chainId: 'vrm' | 'vrc',
  blocks: { height: number; hash: string }[],
  limit = 4
): SearchSuggestion[] {
  return blocks.slice(0, limit).map((block) => ({
    id: `${chainId}-recent-${block.hash}`,
    label: `Block #${block.height.toLocaleString()}`,
    sublabel: `${chainId.toUpperCase()} · recent`,
    path: `/${chainId}/block/${block.height}`,
    chainId,
    entityType: 'block' as const,
  }));
}

export function mergeSearchResults(
  vrmPath: string | null,
  vrcPath: string | null,
  query: string
): SearchSuggestion[] {
  const kind = classifySearchQuery(query);
  const hits: SearchSuggestion[] = [];

  if (vrmPath) {
    hits.push({
      id: 'vrm-hit',
      label: suggestionLabelFromPath(vrmPath, query, kind),
      sublabel: 'Verium',
      path: vrmPath,
      chainId: 'vrm',
      entityType: entityTypeFromPath(vrmPath),
      primary: vrcPath == null,
    });
  }
  if (vrcPath) {
    hits.push({
      id: 'vrc-hit',
      label: suggestionLabelFromPath(vrcPath, query, kind),
      sublabel: 'VeriCoin',
      path: vrcPath,
      chainId: 'vrc',
      entityType: entityTypeFromPath(vrcPath),
      primary: vrmPath == null,
    });
  }

  if (hits.length === 0) {
    return [];
  }

  if (hits.length === 1) {
    hits[0].primary = true;
  }

  return hits;
}

function suggestionLabelFromPath(path: string, query: string, kind: SearchQueryKind): string {
  if (kind === 'height') return `Block #${sanitizeSearchQuery(query)}`;
  if (path.includes('/tx/')) return 'Transaction';
  if (path.includes('/block/')) return 'Block hash';
  if (path.includes('/address/')) {
    const trimmed = sanitizeSearchQuery(query);
    return trimmed.length > 24 ? `${trimmed.slice(0, 12)}…${trimmed.slice(-8)}` : trimmed;
  }
  return sanitizeSearchQuery(query);
}
