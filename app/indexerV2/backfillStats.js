'use strict';

const dbModule = require('./db.js');
const {
  createPeriodStatStatements,
  recordAddressPeriodEvent,
  recordAddressBalanceBucket,
  recordTransactionActivity,
  recordBlockActivity,
  hourBucketStart,
  getPeriodBoundsForTime,
  toSafeInteger,
} = require('./periodStats.js');
const { yieldToReaders, resolveYieldMs } = require('./yield.js');
const writeLock = require('./writeLock.js');

function getBackfillBatchSize() {
  const configured = Number(process.env.VCEXP_BACKFILL_STATS_BATCH_SIZE ?? 500);
  return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : 500;
}

function toCount(value) {
  return toSafeInteger(value);
}

function logProgress(phase, processed, total) {
  const done = toCount(processed);
  const goal = toCount(total);
  const pct = goal > 0 ? ((done / goal) * 100).toFixed(1) : '?';
  process.stderr.write(`[backfill-stats] ${phase}: ${done}/${goal} (${pct}%)\n`);
}

function getAddressActivityCategory(row) {
  if (row.event_type === 'spend') {
    return 'spent';
  }

  if (Number(row.is_coinstake)) {
    return 'staked';
  }

  if (Number(row.is_coinbase)) {
    return 'mined';
  }

  return 'received';
}

async function runBatchTransaction(db, rows, fn) {
  if (rows.length === 0) {
    return;
  }

  await db.runTransaction(async (txdb) => {
    const statements = createPeriodStatStatements(txdb);
    for (const row of rows) {
      await fn(statements, row);
    }
  });
}

async function backfillTransactions(db, chainId, batchSize, now) {
  const transactionCount = toCount(
    (
      await db.get(
        `
		SELECT COUNT(*) AS count
		FROM transactions
		WHERE chain_id = ? AND time IS NOT NULL
	`,
        [chainId]
      )
    ).count
  );

  const selectTransactions = `
		SELECT time, is_coinbase, is_coinstake, block_height, tx_index
		FROM transactions
		WHERE chain_id = ?
			AND time IS NOT NULL
			AND (
				block_height > ?
				OR (block_height = ? AND tx_index >= ?)
			)
		ORDER BY block_height ASC, tx_index ASC
		LIMIT ?
	`;

  let lastHeight = -1;
  let lastTxIndex = 0;
  let processed = 0;

  while (true) {
    const batch = await db.all(selectTransactions, [
      chainId,
      lastHeight,
      lastHeight,
      lastTxIndex,
      batchSize,
    ]);
    if (batch.length === 0) {
      break;
    }

    await runBatchTransaction(db, batch, (statements, tx) =>
      recordTransactionActivity(
        statements,
        chainId,
        tx.time,
        Number(tx.is_coinbase),
        Number(tx.is_coinstake),
        now
      )
    );

    const last = batch[batch.length - 1];
    lastHeight = toCount(last.block_height);
    lastTxIndex = toCount(last.tx_index) + 1;
    processed += batch.length;
    logProgress(`${chainId} transactions (chain activity)`, processed, transactionCount);
    await yieldToReaders();
  }

  return transactionCount;
}

async function backfillBlocks(db, chainId, batchSize, now) {
  const blockCount = toCount(
    (
      await db.get(
        `
		SELECT COUNT(*) AS count
		FROM blocks
		WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
	`,
        [chainId]
      )
    ).count
  );

  const selectBlocks = `
		SELECT time, height
		FROM blocks
		WHERE chain_id = ?
			AND status = 'main'
			AND time IS NOT NULL
			AND height > ?
		ORDER BY height ASC
		LIMIT ?
	`;

  let lastHeight = -1;
  let processed = 0;

  while (true) {
    const batch = await db.all(selectBlocks, [chainId, lastHeight, batchSize]);
    if (batch.length === 0) {
      break;
    }

    await runBatchTransaction(db, batch, (statements, block) =>
      recordBlockActivity(statements, chainId, block.time, now)
    );

    lastHeight = toCount(batch[batch.length - 1].height);
    processed += batch.length;
    logProgress(`${chainId} blocks (chain activity)`, processed, blockCount);
    await yieldToReaders();
  }

  return blockCount;
}

async function backfillAddressEvents(db, chainId, batchSize, now) {
  const eventCount = toCount(
    (
      await db.get(
        `
		SELECT COUNT(*) AS count
		FROM address_events
		WHERE chain_id = ?
	`,
        [chainId]
      )
    ).count
  );

  const selectEvents = `
		SELECT
			address_events.id,
			address_events.address,
			address_events.delta_sats,
			address_events.block_height,
			address_events.time,
			address_events.event_type,
			transactions.is_coinbase,
			transactions.is_coinstake
		FROM address_events
		INNER JOIN transactions
			ON transactions.chain_id = address_events.chain_id
			AND transactions.txid = address_events.txid
		WHERE address_events.chain_id = ?
			AND address_events.id > ?
		ORDER BY address_events.id ASC
		LIMIT ?
	`;

  let lastEventId = 0;
  let processedEvents = 0;

  while (true) {
    const batch = await db.all(selectEvents, [chainId, lastEventId, batchSize]);
    if (batch.length === 0) {
      break;
    }

    await runBatchTransaction(db, batch, (statements, row) =>
      recordAddressBalanceBucket(
        statements,
        chainId,
        row.address,
        row.delta_sats,
        row.time,
        getAddressActivityCategory(row),
        now
      )
    );

    lastEventId = toCount(batch[batch.length - 1].id);
    processedEvents += batch.length;
    logProgress(`${chainId} address events (balance buckets)`, processedEvents, eventCount);
    await yieldToReaders();
  }

  return eventCount;
}

async function backfillPeriodStats(db, chainId, batchSize, now, eventCount) {
  const totalEvents = toCount(eventCount);
  const selectPeriodRows = `
		SELECT
			id,
			address,
			time,
			delta_sats,
			txid,
			block_height
		FROM address_events
		WHERE chain_id = ?
			AND id > ?
		ORDER BY id ASC
		LIMIT ?
	`;

  const seenTxByPeriod = new Set();
  let lastEventId = 0;
  let processedEvents = 0;

  while (true) {
    const batch = await db.all(selectPeriodRows, [chainId, lastEventId, batchSize]);
    if (batch.length === 0) {
      break;
    }

    await runBatchTransaction(db, batch, async (statements, row) => {
      for (const period of ['week', 'month']) {
        const bounds = getPeriodBoundsForTime(period, row.time);
        const txKey = `${bounds.periodStart}:${row.address}:${row.txid}`;
        const txCountIncrement = !seenTxByPeriod.has(txKey);
        if (txCountIncrement) {
          seenTxByPeriod.add(txKey);
        }

        await recordAddressPeriodEvent(
          statements,
          chainId,
          row.address,
          row.delta_sats,
          row.block_height,
          row.time,
          txCountIncrement,
          now
        );
      }
    });

    lastEventId = toCount(batch[batch.length - 1].id);
    processedEvents += batch.length;
    logProgress(`${chainId} period stats`, processedEvents, totalEvents);
    await yieldToReaders();
  }
}

async function logIndexedCoverage(db, chainId) {
  const coverage = await db.get(
    `
		SELECT
			(SELECT COUNT(*) FROM blocks WHERE chain_id = ? AND status = 'main') AS main_blocks,
			(SELECT MAX(height) FROM blocks WHERE chain_id = ? AND status = 'main') AS max_indexed_height,
			(SELECT last_indexed_height FROM sync_state WHERE chain_id = ?) AS last_indexed_height,
			(SELECT best_rpc_height FROM sync_state WHERE chain_id = ?) AS best_rpc_height
	`,
    [chainId, chainId, chainId, chainId]
  );

  const mainBlocks = toCount(coverage.main_blocks);
  const maxHeight = toCount(coverage.max_indexed_height);
  const lastIndexed = toCount(coverage.last_indexed_height);
  const rpcTip = toCount(coverage.best_rpc_height);

  process.stderr.write(
    `[backfill-stats] indexed coverage: ${mainBlocks} main-chain block rows, ` +
      `max height ${maxHeight}, sync_state last_indexed=${lastIndexed}, rpc_tip=${rpcTip}\n`
  );

  if (rpcTip > 0 && maxHeight > 0 && maxHeight < rpcTip - 10) {
    process.stderr.write(
      `[backfill-stats] warning: indexer is ~${rpcTip - maxHeight} blocks behind RPC tip; ` +
        'backfill only covers indexed blocks. Let vrc-indexer catch up, then re-run.\n'
    );
  }
}

async function backfillChain(db, chainId, options = {}) {
  // Postgres handles writer concurrency natively; the SQLite file write-lock is
  // only meaningful on the sqlite backend.
  const cooperative =
    dbModule.getBackend() !== 'postgres' &&
    options.cooperative !== false &&
    parseTruthy(process.env.VCEXP_BACKFILL_COOPERATIVE) !== false;
  const lockOwner = `backfill-stats:${chainId}`;
  let lock = cooperative ? writeLock.tryAcquireWriteLock(lockOwner) : { skipped: false, fd: null };

  if (cooperative && lock.skipped) {
    return {
      chainId,
      skipped: true,
      reason: 'write-lock-held',
      holder: lock.holder || null,
    };
  }

  try {
    return await backfillChainLocked(db, chainId, options);
  } finally {
    if (cooperative) {
      writeLock.releaseWriteLock(lock);
    }
  }
}

function parseTruthy(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

async function backfillChainLocked(db, chainId, options = {}) {
  const now = Date.now();
  const batchSize = options.batchSize ?? getBackfillBatchSize();

  await logIndexedCoverage(db, chainId);

  const eventCount = toCount(
    (
      await db.get(
        `
		SELECT COUNT(*) AS count FROM address_events WHERE chain_id = ?
	`,
        [chainId]
      )
    ).count
  );
  const transactionCount = toCount(
    (
      await db.get(
        `
		SELECT COUNT(*) AS count FROM transactions WHERE chain_id = ? AND time IS NOT NULL
	`,
        [chainId]
      )
    ).count
  );
  const blockCount = toCount(
    (
      await db.get(
        `
		SELECT COUNT(*) AS count FROM blocks WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
	`,
        [chainId]
      )
    ).count
  );

  process.stderr.write(
    `[backfill-stats] starting ${chainId}: ` +
      `${transactionCount} txs, ${blockCount} blocks, ${eventCount} address events ` +
      `(batch size ${batchSize}, yield ${resolveYieldMs()}ms)\n`
  );
  process.stderr.write(
    '[backfill-stats] chain_activity_buckets fill during transactions/blocks phases; ' +
      'address_balance_buckets fill during address-events phase\n'
  );

  await db.run(`DELETE FROM address_balance_buckets WHERE chain_id = ?`, [chainId]);
  await db.run(`DELETE FROM chain_activity_buckets WHERE chain_id = ?`, [chainId]);
  await db.run(`DELETE FROM address_period_stats WHERE chain_id = ?`, [chainId]);

  const transactions = await backfillTransactions(db, chainId, batchSize, now);
  const blocks = await backfillBlocks(db, chainId, batchSize, now);
  const events = await backfillAddressEvents(db, chainId, batchSize, now);
  await backfillPeriodStats(db, chainId, batchSize, now, events);

  return {
    chainId,
    events,
    transactions,
    blocks,
  };
}

async function main() {
  const chainId = process.argv[2];
  const db = dbModule.openDatabase(undefined, {
    skipSeed: true,
    busyTimeoutMs: 120_000,
  });

  if (chainId) {
    const result = await backfillChain(db, chainId);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const results = [];
  for (const id of ['vrm', 'vrc']) {
    results.push(await backfillChain(db, id));
  }
  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  backfillChain,
  hourBucketStart,
  getBackfillBatchSize,
};
