'use strict';

// Comprehensive read-path smoke test against the configured backend.
// Run with VCEXP_DB_BACKEND=postgres and VCEXP_PG_URL set.

const query = require('./query.js');
const health = require('./health.js');

async function main() {
  const out = {};

  for (const chain of ['vrc', 'vrm']) {
    const summary = await query.getChainSummary(chain, {});
    const richlist = await query.getRichlist(chain, { limit: 3 });
    const blocksPage = await query.getBlocksPage(chain, { limit: 3 });
    const chainHealth = await health.getChainHealth(chain, { fullHealth: true });
    const tipHeight = summary.latestBlocks[0] ? summary.latestBlocks[0].height : null;

    const block =
      tipHeight != null ? await query.getBlock(chain, String(tipHeight), { limit: 5 }) : null;
    const firstTxid = block && block.transactions[0] ? block.transactions[0].txid : null;
    const tx = firstTxid ? await query.getTransaction(chain, firstTxid, {}) : null;
    const topAddr = richlist.items[0] ? richlist.items[0].address : null;
    const address = topAddr ? await query.getAddress(chain, topAddr, { includeRank: true }) : null;
    const utxos = topAddr ? await query.getAddressUtxos(chain, topAddr, { limit: 2 }) : null;
    const balHist = topAddr
      ? await query.getAddressBalanceHistory(chain, topAddr, { maxPoints: 30 })
      : null;
    const leaderboard = await query.getLeaderboard(chain, {
      period: 'month',
      sort: 'activity',
      limit: 3,
    });
    const miners = await query.getMinedLeaderboard(chain, { period: 'all', limit: 3 });
    const activity = await query.getChainActivityHistory(chain, { maxPoints: 20 });
    const netHist = await query.getNetworkMetricHistory(chain, { maxPoints: 20 });
    // Indexed supply is only used as a VRM fallback in production (VRC supply
    // comes from RPC). Guard it so the heavy VRC series build does not block.
    let supply = null;
    if (tipHeight != null && chain === 'vrm') {
      supply = await query
        .getIndexedSupplyAtHeight(chain, { height: tipHeight })
        .catch(() => ({ supply: null }));
    }
    const hashrate = await query.getIndexedHashrate7dAvg(chain, {});

    out[chain] = {
      status: summary.health.status,
      tipHeight,
      richlistTop: richlist.items[0] ? richlist.items[0].address : null,
      richlistTotal: richlist.paging ? richlist.paging.total : null,
      blocksPageTotal: blocksPage.paging ? blocksPage.paging.total : null,
      blockFound: block ? block.found : null,
      blockTxs: block ? block.transactions.length : null,
      coinbaseReward: block && block.coinbase ? block.coinbase.reward.amount : null,
      blockTotalsOutput:
        block && block.totals ? block.totals.outputValue && block.totals.outputValue.amount : null,
      txFound: tx ? tx.found : null,
      txInputs: tx ? tx.inputs.length : null,
      txOutputs: tx ? tx.outputs.length : null,
      addressFound: address ? address.found : null,
      addressBalance: address ? address.balance.balance.amount : null,
      addressRank: address && address.richlist ? address.richlist.rank : null,
      addressTxs: address ? address.transactions.length : null,
      utxoCount: utxos ? utxos.summary.utxoCount : null,
      balHistPoints: balHist ? balHist.points.length : null,
      leaderboardItems: leaderboard.items ? leaderboard.items.length : null,
      minersItems: miners.items ? miners.items.length : null,
      minersTop: miners.items && miners.items[0] ? miners.items[0].mined.amount : null,
      activityBuckets: activity.buckets ? activity.buckets.length : null,
      netHistBuckets: netHist.buckets ? netHist.buckets.length : null,
      supply: supply ? supply.supply : null,
      hashrate7d: hashrate ? hashrate.hashrate7dKhPerMin : null,
      addressCount: chainHealth.counts.addressCount,
    };
  }

  console.log(JSON.stringify(out, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('SMOKE FAIL:', err);
    process.exit(1);
  });
