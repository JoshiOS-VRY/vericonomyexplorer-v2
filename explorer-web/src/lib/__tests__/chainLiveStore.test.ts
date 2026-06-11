import { describe, expect, it, beforeEach } from '@jest/globals';
import { chainLiveStore, mergeRecentTransactions } from '@/lib/chainLive/store';
import type { IndexedTransaction } from '@/lib/api/types';

const sampleTx: IndexedTransaction = {
  txid: 'abc',
  blockHeight: 1,
  blockHash: 'hash',
  txIndex: 0,
  time: 1,
  isCoinbase: true,
  isCoinstake: false,
};

describe('mergeRecentTransactions', () => {
  it('keeps previous rows when a lite poll returns none', () => {
    expect(mergeRecentTransactions([sampleTx], [])).toEqual([sampleTx]);
  });

  it('replaces rows when a full summary payload includes transactions', () => {
    const next: IndexedTransaction = { ...sampleTx, txid: 'def' };
    expect(mergeRecentTransactions([sampleTx], [next])).toEqual([next]);
  });
});

describe('chainLiveStore.getSnapshot', () => {
  beforeEach(() => {
    chainLiveStore.ensureChain('vrm', {
      chainId: 'vrm',
      health: {
        id: 'vrm',
        ticker: 'VRM',
        name: 'Verium',
        consensus: 'PoWT',
        status: 'trusted',
        trusted: true,
        trustLevel: 'full',
        message: 'Complete chain history is available.',
        reasons: [],
        checks: {
          hasBlocks: true,
          startsAtGenesis: true,
          noHeightGaps: true,
          noUnresolvedSpends: true,
          hasRpcTip: true,
          nearTip: true,
          consistentTip: true,
        },
        heights: {
          bestRpcHeight: 100,
          minIndexedHeight: 0,
          maxIndexedHeight: 100,
          lastIndexedHeight: 100,
          blocksBehind: 0,
          tipThreshold: 10,
        },
        counts: {
          indexedBlockCount: 101,
          expectedBlockCount: 101,
          gapCount: 0,
          unresolvedSpendCount: 0,
          addressCount: 1,
        },
        syncState: {
          status: 'indexed',
          statusMessage: null,
          updatedAt: 1,
          lastIndexedHash: 'abc',
        },
        sourceLabels: {
          blocks: 'rpc+index',
          transactions: 'index-required',
          addressBalances: 'index',
          richlist: 'index',
          leaderboards: 'index',
        },
      },
      latestBlocks: [
        {
          height: 100,
          hash: 'abc',
          time: 1,
          txCount: 1,
        },
      ],
      recentTransactions: [],
      source: { label: 'index', type: 'index' },
    });
  });

  it('returns the same object reference when the store has not changed', () => {
    const first = chainLiveStore.getSnapshot('vrm');
    const second = chainLiveStore.getSnapshot('vrm');

    expect(first).toBe(second);
  });
});
