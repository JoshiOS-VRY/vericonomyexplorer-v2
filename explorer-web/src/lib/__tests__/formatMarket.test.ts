import {
  formatBtcPrice,
  formatHashrateKhPerMin,
  formatPercentChange,
  formatSupply,
  formatUsdPrice,
  hashPerSecToKhPerMin,
} from '@/lib/formatMarket';

describe('formatMarket', () => {
  it('formats USD prices', () => {
    expect(formatUsdPrice(0.07)).toBe('$0.07');
    expect(formatUsdPrice(206656.99)).toBe('$206,656.99');
  });

  it('formats BTC cross rates', () => {
    expect(formatBtcPrice(0.00000301)).toBe('0.00000301');
  });

  it('formats hashrate in KH/m', () => {
    expect(formatHashrateKhPerMin(117.09)).toBe('117.09 KH/m');
  });

  it('converts hash/s to KH/m', () => {
    expect(hashPerSecToKhPerMin(1951.5)).toBeCloseTo(117.09, 2);
  });

  it('formats supply with ticker', () => {
    expect(formatSupply(3712002, 'VRM')).toBe('3,712,002 VRM');
  });

  it('formats percent change', () => {
    expect(formatPercentChange(2.5)).toBe('+2.50%');
    expect(formatPercentChange(-1.2)).toBe('-1.20%');
  });

  it('returns em dash for null values', () => {
    expect(formatUsdPrice(null)).toBe('—');
    expect(formatBtcPrice(undefined)).toBe('—');
  });
});
