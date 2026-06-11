import { describe, expect, it } from '@jest/globals';
import type { AddressEvent } from '@/lib/api/types';
import { aggregateAddressEvents } from '@/lib/txLabels';

function spend(address: string, amount: string, atomic: string): AddressEvent {
  return {
    address,
    eventType: 'spend',
    deltaAtomic: atomic,
    delta: { amount: `-${amount}`, ticker: 'VRM' },
  };
}

describe('aggregateAddressEvents', () => {
  it('merges repeated spends from the same address', () => {
    const events = [
      spend('addrA', '1.5', '-150000000'),
      spend('addrA', '2.0', '-200000000'),
      spend('addrB', '1.0', '-100000000'),
    ];

    const aggregated = aggregateAddressEvents(events);

    expect(aggregated).toHaveLength(2);
    expect(aggregated[0].address).toBe('addrA');
    expect(aggregated[0].contributionCount).toBe(2);
    expect(aggregated[0].deltaAtomic).toBe('-350000000');
    expect(aggregated[0].delta.amount).toBe('-3.5');
  });
});
