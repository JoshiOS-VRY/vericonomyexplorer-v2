import {
  mergeHistoryEntry,
  parseSearchHistory,
  type SearchHistoryEntry,
} from '@/lib/searchHistory';

function entry(path: string, ts = 1): SearchHistoryEntry {
  return {
    query: path,
    label: path,
    path,
    chainId: 'vrm',
    entityType: 'block',
    ts,
  };
}

describe('searchHistory', () => {
  it('prepends new entries most-recent-first', () => {
    const result = mergeHistoryEntry([entry('/a')], entry('/b'));
    expect(result.map((e) => e.path)).toEqual(['/b', '/a']);
  });

  it('dedupes by path, moving repeats to the front', () => {
    const result = mergeHistoryEntry([entry('/a'), entry('/b'), entry('/c')], entry('/b', 99));
    expect(result.map((e) => e.path)).toEqual(['/b', '/a', '/c']);
    expect(result[0].ts).toBe(99);
  });

  it('caps the list at the requested maximum', () => {
    const start = [entry('/a'), entry('/b'), entry('/c')];
    const result = mergeHistoryEntry(start, entry('/d'), 3);
    expect(result.map((e) => e.path)).toEqual(['/d', '/a', '/b']);
  });

  it('parses valid stored entries and rejects junk', () => {
    const raw = JSON.stringify([
      entry('/ok'),
      { path: 123 },
      { path: '/x', label: 'x', chainId: 'doge', entityType: 'block' },
      null,
    ]);
    const parsed = parseSearchHistory(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].path).toBe('/ok');
  });

  it('returns an empty list for invalid JSON or null', () => {
    expect(parseSearchHistory(null)).toEqual([]);
    expect(parseSearchHistory('not json')).toEqual([]);
    expect(parseSearchHistory('{}')).toEqual([]);
  });
});
