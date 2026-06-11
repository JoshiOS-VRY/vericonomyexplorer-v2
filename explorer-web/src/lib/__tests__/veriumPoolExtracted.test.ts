import { describe, expect, it } from '@jest/globals';
import {
  VERIUM_POOL_DISPLAY_NAME,
  VERIUM_POOL_PAYOUT_ADDRESS,
  isVeriumPoolExtracted,
  isVeriumPoolPayoutAddress,
} from '@/lib/veriumPoolExtracted';

describe('isVeriumPoolPayoutAddress', () => {
  it('matches the Vericonomy pool payout address', () => {
    expect(isVeriumPoolPayoutAddress(VERIUM_POOL_PAYOUT_ADDRESS)).toBe(true);
  });

  it('rejects other addresses', () => {
    expect(isVeriumPoolPayoutAddress('VRotherAddress')).toBe(false);
  });
});

describe('isVeriumPoolExtracted', () => {
  it('matches the Vericonomy pool display name', () => {
    expect(isVeriumPoolExtracted({ extractedBy: VERIUM_POOL_DISPLAY_NAME })).toBe(true);
  });

  it('matches pool payout address without display name', () => {
    expect(
      isVeriumPoolExtracted({
        extractedByAddress: VERIUM_POOL_PAYOUT_ADDRESS,
      })
    ).toBe(true);
  });

  it('matches pool.vericonomy.com links', () => {
    expect(
      isVeriumPoolExtracted({
        extractedBy: 'Other',
        extractedByLink: 'https://pool.vericonomy.com/',
      })
    ).toBe(true);
  });

  it('does not match other mining pools', () => {
    expect(
      isVeriumPoolExtracted({
        extractedBy: 'VeriumPool',
        extractedByLink: 'https://veriumpool.com',
      })
    ).toBe(false);
  });
});
