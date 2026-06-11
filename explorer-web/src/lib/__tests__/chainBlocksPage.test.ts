import { describe, expect, it } from '@jest/globals';
import { pickBlockPageBase } from '@/lib/chainBlocksPage';
import type { IndexedBlock } from '@/lib/api/types';

function block(height: number): IndexedBlock {
  return { height, hash: `hash-${height}`, time: height, txCount: 1 };
}

describe('pickBlockPageBase', () => {
  it('prefers a filled page that reaches the live tip', () => {
    const filled = [block(100), block(99)];
    const live = [block(100)];

    expect(pickBlockPageBase(filled, live)).toBe(filled);
  });

  it('prefers live blocks when the filled page lags behind the tip', () => {
    const filled = [block(18_678), block(18_677)];
    const live = [block(1_100_219), block(1_100_218)];

    expect(pickBlockPageBase(filled, live)).toBe(live);
  });

  it('falls back to live blocks when filled page is empty', () => {
    const live = [block(100), block(99)];

    expect(pickBlockPageBase([], live)).toBe(live);
  });

  it('falls back to live blocks when filled page is null', () => {
    const live = [block(100)];

    expect(pickBlockPageBase(null, live)).toBe(live);
  });
});
