import { describe, expect, it } from '@jest/globals';
import {
  classifySearchQuery,
  entityTypeFromPath,
  fallbackSuggestions,
  heightSuggestions,
  mergeSearchResults,
  sanitizeSearchQuery,
} from '@/lib/searchSuggestions';

describe('sanitizeSearchQuery', () => {
  it('removes commas, whitespace, labels, and tickers', () => {
    expect(sanitizeSearchQuery('43,931')).toBe('43931');
    expect(sanitizeSearchQuery('Balance 120756.46126255 VRC')).toBe('120756.46126255');
    expect(sanitizeSearchQuery('  VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR  ')).toBe(
      'VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR'
    );
  });
});

describe('classifySearchQuery', () => {
  it('classifies heights, hashes, and addresses', () => {
    expect(classifySearchQuery('12,345')).toBe('height');
    expect(classifySearchQuery('a'.repeat(64))).toBe('hash');
    expect(classifySearchQuery('VRMabc')).toBe('address');
  });
});

describe('entityTypeFromPath', () => {
  it('maps paths to entity types', () => {
    expect(entityTypeFromPath('/vrm/block/1')).toBe('block');
    expect(entityTypeFromPath('/vrc/tx/abc')).toBe('tx');
    expect(entityTypeFromPath('/vrm/address/xyz')).toBe('address');
  });
});

describe('heightSuggestions', () => {
  it('returns both chains', () => {
    const items = heightSuggestions('100');
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.path)).toEqual(['/vrm/block/100', '/vrc/block/100']);
    expect(items.every((item) => item.entityType === 'block')).toBe(true);
  });
});

describe('mergeSearchResults', () => {
  it('returns empty when both chains miss', () => {
    expect(mergeSearchResults(null, null, '999999999')).toEqual([]);
  });

  it('marks a single hit as primary', () => {
    const hits = mergeSearchResults('/vrm/tx/abc', null, 'a'.repeat(64));
    expect(hits).toHaveLength(1);
    expect(hits[0].primary).toBe(true);
    expect(hits[0].entityType).toBe('tx');
  });

  it('labels block hash paths correctly', () => {
    const hits = mergeSearchResults(`/vrm/block/${'b'.repeat(64)}`, null, 'b'.repeat(64));
    expect(hits[0].label).toBe('Block hash');
    expect(hits[0].entityType).toBe('block');
  });
});

describe('fallbackSuggestions', () => {
  it('marks tentative guesses', () => {
    const items = fallbackSuggestions('deadbeef', 'address');
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.tentative)).toBe(true);
  });
});
