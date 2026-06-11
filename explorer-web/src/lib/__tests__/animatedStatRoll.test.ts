import { describe, expect, it } from '@jest/globals';
import { getDigitRollParts } from '@/lib/animatedStatRoll';

const formatHeight = (value: number) => new Intl.NumberFormat('en-US').format(value);

describe('getDigitRollParts', () => {
  it('rolls only the last digit for +1 block height', () => {
    expect(getDigitRollParts(1_098_784, 1_098_785, formatHeight)).toEqual({
      prefix: '1,098,78',
      fromDigit: '4',
      toDigit: '5',
      staticSuffix: '',
    });
  });

  it('rolls the supply digit before the ticker suffix', () => {
    const formatSupply = (value: number) => `${formatHeight(value)} VRM`;
    expect(getDigitRollParts(3_712_386, 3_712_387, formatSupply)).toEqual({
      prefix: '3,712,38',
      fromDigit: '6',
      toDigit: '7',
      staticSuffix: ' VRM',
    });
  });

  it('skips roll when multiple digits change', () => {
    expect(getDigitRollParts(1_098_799, 1_098_800, formatHeight)).toBeNull();
  });

  it('skips roll for large jumps', () => {
    expect(getDigitRollParts(1_098_784, 1_098_900, formatHeight)).toBeNull();
  });
});
