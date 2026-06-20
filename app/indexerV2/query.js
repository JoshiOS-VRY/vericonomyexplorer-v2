'use strict';

const dbModule = require('./db.js');
const health = require('./health.js');
const { computeBlockTotalsRaw, computeBlockTotalsRawAsync } = require('./blockTotals.js');
const utils = require('../utils.js');
const { hourBucketStart } = require('./periodStats.js');
const { atomicUnitsToDecimal } = require('./valueUtils.js');
const { indexedSupplyAtHeight } = require('./supplyHistory.js');
const { formatChartDayLabel } = require('./chartDates.js');
const { difficultyToHashPerSec, hashPerSecToKhPerMin } = require('./networkMetrics.js');
const { attachMinerLink, chainIdToTicker, mapMinerFields } = require('./miningPoolConfigs.js');

const defaultLimit = 25;
const maxLimit = 100;
const defaultBalanceHistoryPoints = 120;
const maxBalanceHistoryPoints = 500;
const maxBalanceHistoryEvents = 50000;

const stmtCache = new Map();

const fundedAddressTotals = new Map();

async function getFundedAddressTotal(db, chain) {
  const ttlMs = Number(process.env.VCEXP_FUNDED_ADDRESS_CACHE_MS ?? 60_000);
  const cached = fundedAddressTotals.get(chain);
  if (cached && Date.now() - cached.at < ttlMs) {
    return cached.total;
  }

  const total = toNumber(
    (
      await db.get(
        `
		SELECT COUNT(*) AS count
		FROM address_balances
		WHERE chain_id = ? AND balance_sats > 0
	`,
        [chain]
      )
    ).count
  );
  fundedAddressTotals.set(chain, { at: Date.now(), total });
  return total;
}

function prepare(db, sql) {
  if (!stmtCache.has(sql)) {
    stmtCache.set(sql, db.prepare(sql));
  }

  return stmtCache.get(sql);
}

const ADDRESS_UTXO_UNSPENT_SQL = `
	SELECT
		vouts.txid,
		vouts.n,
		vouts.value_sats,
		transactions.block_height,
		transactions.time
	FROM vouts
	JOIN transactions
		ON transactions.chain_id = vouts.chain_id
		AND transactions.txid = vouts.txid
	WHERE vouts.chain_id = ?
		AND vouts.is_spent = 0
		AND vouts.address = ?
	UNION
	SELECT
		vouts.txid,
		vouts.n,
		vouts.value_sats,
		transactions.block_height,
		transactions.time
	FROM vout_addresses
	JOIN vouts
		ON vouts.chain_id = vout_addresses.chain_id
		AND vouts.txid = vout_addresses.txid
		AND vouts.n = vout_addresses.n
	JOIN transactions
		ON transactions.chain_id = vouts.chain_id
		AND transactions.txid = vouts.txid
	WHERE vout_addresses.chain_id = ?
		AND vout_addresses.address = ?
		AND vouts.is_spent = 0
		AND (vouts.address IS NULL OR vouts.address != ?)
`;

const ADDRESS_UTXO_LIST_SQL = `
	WITH unspent AS (${ADDRESS_UTXO_UNSPENT_SQL})
	SELECT txid, n, value_sats, block_height, time
	FROM unspent
	ORDER BY value_sats DESC, txid ASC, n ASC
	LIMIT ? OFFSET ?
`;

const ADDRESS_UTXO_SUMMARY_ONLY_SQL = `
	WITH unspent AS (${ADDRESS_UTXO_UNSPENT_SQL})
	SELECT COUNT(*) AS count, COALESCE(SUM(value_sats), 0) AS total_sats
	FROM unspent
`;

const chainUnits = {
  vrc: {
    ticker: 'VRC',
    decimalPlaces: 8,
  },
  vrm: {
    ticker: 'VRM',
    decimalPlaces: 8,
  },
};

async function resolveChainHealth(chain, options = {}) {
  if (options.chainHealth) {
    return options.chainHealth;
  }

  return health.getChainHealth(chain, { db: options.db, ...options });
}

async function getChainSummary(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const chainHealth = await resolveChainHealth(chain, options);
  const latestBlocks = (
    await db.all(
      `
		SELECT height, hash, previous_hash, next_hash, time, tx_count, size, difficulty,
			output_count, extracted_by, extracted_by_address
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
		ORDER BY height DESC
		LIMIT 10
	`,
      [chain]
    )
  ).map((block) => mapBlock(block, chain));
  let enrichedLatestBlocks =
    options.skipBlockEnrichment === true
      ? latestBlocks
      : await enrichLatestBlocks(db, chain, latestBlocks);
  if (chain === 'vrc') {
    enrichedLatestBlocks = await enrichBlockInterestRates(chain, enrichedLatestBlocks, { db });
  }
  const recentTransactions = (
    await db.all(
      `
		SELECT txid, block_height, block_hash, tx_index, time, is_coinbase, is_coinstake
		FROM transactions
		WHERE chain_id = ?
		ORDER BY block_height DESC, tx_index DESC
		LIMIT 25
	`,
      [chain]
    )
  ).map((tx) => mapTransaction(tx));

  return {
    chainId: chain,
    health: chainHealth,
    latestBlocks: enrichedLatestBlocks,
    recentTransactions,
    source: getSource(chainHealth, 'summary'),
  };
}

async function getChainSummaryLite(chainId, options = {}) {
  const summary = await getLatestBlocks(chainId, options);

  return Object.assign({}, summary, {
    recentTransactions: [],
  });
}

const defaultLatestBlocksLimit = 10;
const maxLatestBlocksLimit = 25;
const defaultBlocksPageLimit = 20;
const maxBlocksPageLimit = 100;

function normalizeLatestBlocksLimit(value) {
  const parsed = Number(value || defaultLatestBlocksLimit);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultLatestBlocksLimit;
  }

  return Math.min(Math.floor(parsed), maxLatestBlocksLimit);
}

function normalizeBlocksPageLimit(value) {
  const parsed = Number(value || defaultBlocksPageLimit);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultBlocksPageLimit;
  }

  return Math.min(Math.floor(parsed), maxBlocksPageLimit);
}

async function getLatestBlocks(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const limit = normalizeLatestBlocksLimit(options.limit);
  const chainHealth = await resolveChainHealth(chain, options);
  const latestBlocks = (
    await db.all(
      `
		SELECT height, hash, previous_hash, next_hash, time, tx_count, size, difficulty,
			output_count, extracted_by, extracted_by_address, total_output_sats
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
		ORDER BY height DESC
		LIMIT ?
	`,
      [chain, limit]
    )
  ).map((block) => mapBlock(block, chain));
  let enrichedLatestBlocks =
    options.skipBlockEnrichment === true
      ? latestBlocks
      : await enrichLatestBlocks(db, chain, latestBlocks);

  if (chain === 'vrc') {
    enrichedLatestBlocks = await enrichBlockInterestRates(chain, enrichedLatestBlocks, { db });
  }

  return {
    chainId: chain,
    health: chainHealth,
    latestBlocks: enrichedLatestBlocks,
    source: getSource(chainHealth, 'summary'),
  };
}

async function getBlocksPage(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const limit = normalizeBlocksPageLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const chainHealth = await resolveChainHealth(chain, options);

  if (!chainHealth.checks.hasBlocks) {
    return {
      chainId: chain,
      enabled: false,
      health: chainHealth,
      source: getSource(chainHealth, 'blocks'),
      items: [],
      paging: getPaging(limit, offset, 0),
    };
  }

  const countRow = await db.get(
    `
		SELECT COUNT(*) AS count
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
	`,
    [chain]
  );
  const rows = (
    await db.all(
      `
		SELECT height, hash, previous_hash, next_hash, time, tx_count, size, difficulty,
			output_count, extracted_by, extracted_by_address, total_output_sats
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
		ORDER BY height DESC
		LIMIT ? OFFSET ?
	`,
      [chain, limit, offset]
    )
  ).map((block) => mapBlock(block, chain));
  let items =
    options.skipBlockEnrichment === true ? rows : await enrichLatestBlocks(db, chain, rows);

  if (chain === 'vrc') {
    items = await enrichBlockInterestRates(chain, items, { db });
  }

  return {
    chainId: chain,
    enabled: true,
    health: chainHealth,
    source: getSource(chainHealth, 'blocks'),
    items,
    paging: getPaging(limit, offset, countRow.count),
  };
}

async function getRichlist(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const chainHealth = await resolveChainHealth(chain, options);

  if (!chainHealth.checks.hasBlocks) {
    return disabledResponse(chain, chainHealth, 'richlist');
  }

  const rows = await db.all(
    `
		SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count, last_seen_height
		FROM address_balances
		WHERE chain_id = ? AND balance_sats > 0
		ORDER BY balance_sats DESC, address ASC
		LIMIT ? OFFSET ?
	`,
    [chain, limit, offset]
  );
  const totalFunded = await getFundedAddressTotal(db, chain);

  return {
    chainId: chain,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'richlist'),
    paging: getPaging(limit, offset, totalFunded),
    items: rows.map((row, index) =>
      Object.assign(
        {
          rank: offset + index + 1,
        },
        mapAddressBalanceCore(chain, row)
      )
    ),
  };
}

async function getLeaderboard(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const period = normalizePeriod(options.period);
  const sort = normalizeLeaderboardSort(options.sort);
  const chainHealth = await resolveChainHealth(chain, options);

  if (!chainHealth.checks.hasBlocks) {
    return disabledResponse(chain, chainHealth, 'leaderboards');
  }

  const periodBounds = getPeriodBounds(period, options.now);
  const orderColumn = {
    received: 'received_sats',
    sent: 'sent_sats',
    net: 'net_sats',
    activity: 'tx_count',
  }[sort];

  const statsCountRow = await db.get(
    `
		SELECT COUNT(*) AS count
		FROM address_period_stats
		WHERE chain_id = ? AND period = ? AND period_start = ?
			AND (received_sats > 0 OR sent_sats > 0)
	`,
    [chain, periodBounds.type, periodBounds.start]
  );

  if (statsCountRow.count > 0) {
    const rows = await db.all(
      `
		SELECT
			address,
			received_sats,
			sent_sats,
			net_sats,
			tx_count,
			last_seen_height,
			last_seen_time
		FROM address_period_stats
		WHERE chain_id = ? AND period = ? AND period_start = ?
			AND (received_sats > 0 OR sent_sats > 0)
		ORDER BY ${orderColumn} DESC, address ASC
		LIMIT ? OFFSET ?
	`,
      [chain, periodBounds.type, periodBounds.start, limit, offset]
    );

    return {
      chainId: chain,
      trusted: chainHealth.trusted,
      source: getSource(chainHealth, 'leaderboards'),
      period: periodBounds,
      sort,
      label: 'Transfer activity',
      paging: getPaging(limit, offset, statsCountRow.count),
      items: rows.map((row, index) => ({
        rank: offset + index + 1,
        address: row.address,
        receivedAtomic: stringifyInteger(row.received_sats),
        received: formatAtomic(chain, row.received_sats),
        sentAtomic: stringifyInteger(row.sent_sats),
        sent: formatAtomic(chain, row.sent_sats),
        netAtomic: stringifyInteger(row.net_sats),
        net: formatAtomic(chain, row.net_sats),
        txCount: toNumber(row.tx_count),
        lastSeenHeight: toNullableNumber(row.last_seen_height),
        lastSeenTime: toNullableNumber(row.last_seen_time),
      })),
    };
  }

  return {
    chainId: chain,
    trusted: false,
    source: getSource(chainHealth, 'leaderboards'),
    period: periodBounds,
    sort,
    label: 'Transfer activity',
    backfillRequired: true,
    paging: getPaging(limit, offset, 0),
    items: [],
  };
}

async function getMinedLeaderboard(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const period = normalizeMinersPeriod(options.period);
  const chainHealth = await resolveChainHealth(chain, options);

  if (chain !== 'vrm') {
    return {
      chainId: chain,
      enabled: false,
      trusted: false,
      source: getSource(chainHealth, 'leaderboards'),
      message: 'Top miners are only available for Verium (VRM).',
      items: [],
    };
  }

  if (!chainHealth.checks.hasBlocks) {
    return disabledResponse(chain, chainHealth, 'leaderboards');
  }

  const periodBounds = getMinersPeriodBounds(period, options.now);
  const since = periodBounds.since;

  // Fast path: the daily miner_stats rollup (maintained by refreshAnalytics.js).
  // Rolling windows are served by summing day buckets at/after the cutoff day.
  const hasRollup = await db.get(
    'SELECT 1 AS present FROM miner_stats WHERE chain_id = ? LIMIT 1',
    [chain]
  );

  if (hasRollup) {
    const sinceDay = since == null ? null : Math.floor(since / 86400) * 86400;
    const filterSql = sinceDay == null ? 'chain_id = ?' : 'chain_id = ? AND day_start >= ?';
    const filterParams = sinceDay == null ? [chain] : [chain, sinceDay];

    const countRow = await db.get(
      `
			SELECT COUNT(*) AS count FROM (
				SELECT address
				FROM miner_stats
				WHERE ${filterSql}
				GROUP BY address
				HAVING SUM(mined_sats) > 0
			) AS miners
		`,
      filterParams
    );

    const rows = await db.all(
      `
			SELECT
				address,
				SUM(mined_sats) AS mined_sats,
				SUM(blocks_mined) AS block_count,
				MAX(last_height) AS last_mined_height
			FROM miner_stats
			WHERE ${filterSql}
			GROUP BY address
			HAVING SUM(mined_sats) > 0
			ORDER BY mined_sats DESC, address ASC
			LIMIT ? OFFSET ?
		`,
      [...filterParams, limit, offset]
    );

    return {
      chainId: chain,
      trusted: chainHealth.trusted,
      source: getSource(chainHealth, 'leaderboards'),
      period: periodBounds,
      label: 'Top miners',
      paging: getPaging(limit, offset, countRow.count),
      items: rows.map((row, index) => ({
        rank: offset + index + 1,
        address: row.address,
        minedAtomic: stringifyInteger(row.mined_sats),
        mined: formatAtomic(chain, row.mined_sats),
        blockCount: toNumber(row.block_count),
        lastMinedHeight: toNullableNumber(row.last_mined_height),
      })),
    };
  }

  // Fallback (rollup not seeded yet): scan coinbase outputs directly. Translate
  // the time cutoff into a block-height floor so the coinbase index can
  // range-scan recent blocks instead of every coinbase tx ever mined.
  const sinceHeight = since == null ? null : await resolveMinedSinceHeight(db, chain, since);

  // A bounded period with no qualifying blocks yields nothing — skip the scans.
  if (since != null && sinceHeight == null) {
    return {
      chainId: chain,
      trusted: chainHealth.trusted,
      source: getSource(chainHealth, 'leaderboards'),
      period: periodBounds,
      label: 'Top miners',
      paging: getPaging(limit, offset, 0),
      items: [],
    };
  }

  const { countRow, rows } = await queryMinedLeaderboardRows(
    db,
    chain,
    since,
    sinceHeight,
    limit,
    offset
  );
  const blockStats = await enrichMinedBlockStats(
    db,
    chain,
    rows.map((row) => row.address),
    since,
    sinceHeight
  );

  return {
    chainId: chain,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'leaderboards'),
    period: periodBounds,
    label: 'Top miners',
    paging: getPaging(limit, offset, countRow.count),
    items: rows.map((row, index) => {
      const stats = blockStats.get(row.address) || {
        blockCount: 0,
        lastMinedHeight: null,
      };

      return {
        rank: offset + index + 1,
        address: row.address,
        minedAtomic: stringifyInteger(row.mined_sats),
        mined: formatAtomic(chain, row.mined_sats),
        blockCount: stats.blockCount,
        lastMinedHeight: stats.lastMinedHeight,
      };
    }),
  };
}

const MINERS_EXCLUDED_BLOCK_HEIGHT = 1;

/**
 * Smallest main-chain block height at/after the given unix time. Lets the miner
 * leaderboard prune by indexed block_height instead of scanning every coinbase
 * tx. Returns null when no block falls inside the window.
 */
async function resolveMinedSinceHeight(db, chain, since) {
  const row = await db.get(
    `
		SELECT MIN(height) AS min_height
		FROM blocks
		WHERE chain_id = ? AND status = 'main' AND time >= ?
	`,
    [chain, since]
  );

  return row && row.min_height != null ? toNumber(row.min_height) : null;
}

/**
 * Build the shared period predicate for the miner queries. The block-height
 * floor prunes the coinbase index scan; the blocks.time bound keeps the window
 * exact (block timestamps are not strictly monotonic with height). Coinbase
 * transactions.time is unreliable for VRM, so it is never used here.
 */
function buildMinedPeriodFilter(since, sinceHeight) {
  const clauses = [];
  const params = [];

  if (sinceHeight != null) {
    clauses.push('AND t.block_height >= ?');
    params.push(sinceHeight);
  }
  if (since != null) {
    clauses.push('AND b.time >= ?');
    params.push(since);
  }

  return { sql: clauses.join('\n\t\t\t\t'), params };
}

async function queryMinedLeaderboardRows(db, chain, since, sinceHeight, limit, offset) {
  const period = buildMinedPeriodFilter(since, sinceHeight);

  const countRow = await db.get(
    `
		SELECT COUNT(*) AS count
		FROM (
			SELECT v.address
			FROM transactions t
			INNER JOIN vouts v
				ON v.chain_id = t.chain_id
				AND v.txid = t.txid
			INNER JOIN blocks b
				ON b.chain_id = t.chain_id
				AND b.height = t.block_height
				AND b.status = 'main'
			WHERE t.chain_id = ?
				AND t.is_coinbase = 1
				AND t.block_height != ?
				AND v.value_sats > 0
				AND v.address IS NOT NULL
				${period.sql}
			GROUP BY v.address
			HAVING SUM(v.value_sats) > 0
		) AS mined_addresses
	`,
    [chain, MINERS_EXCLUDED_BLOCK_HEIGHT, ...period.params]
  );

  const rows = await db.all(
    `
		SELECT
			v.address AS address,
			SUM(v.value_sats) AS mined_sats
		FROM transactions t
		INNER JOIN vouts v
			ON v.chain_id = t.chain_id
			AND v.txid = t.txid
		INNER JOIN blocks b
			ON b.chain_id = t.chain_id
			AND b.height = t.block_height
			AND b.status = 'main'
		WHERE t.chain_id = ?
			AND t.is_coinbase = 1
			AND t.block_height != ?
			AND v.value_sats > 0
			AND v.address IS NOT NULL
			${period.sql}
		GROUP BY v.address
		HAVING SUM(v.value_sats) > 0
		ORDER BY mined_sats DESC, address ASC
		LIMIT ? OFFSET ?
	`,
    [chain, MINERS_EXCLUDED_BLOCK_HEIGHT, ...period.params, limit, offset]
  );

  return { countRow, rows };
}

async function enrichMinedBlockStats(db, chain, addresses, since, sinceHeight) {
  const stats = new Map();

  if (!addresses.length) {
    return stats;
  }

  const placeholders = addresses.map(() => '?').join(',');
  const period = buildMinedPeriodFilter(since, sinceHeight);
  const params = [chain, MINERS_EXCLUDED_BLOCK_HEIGHT, ...addresses, ...period.params];

  const sql = `
		SELECT
			v.address AS address,
			COUNT(DISTINCT t.txid) AS block_count,
			MAX(t.block_height) AS last_mined_height
		FROM transactions t
		INNER JOIN vouts v
			ON v.chain_id = t.chain_id
			AND v.txid = t.txid
		INNER JOIN blocks b
			ON b.chain_id = t.chain_id
			AND b.height = t.block_height
			AND b.status = 'main'
		WHERE t.chain_id = ?
			AND t.is_coinbase = 1
			AND t.block_height != ?
			AND v.address IN (${placeholders})
			AND v.value_sats > 0
			${period.sql}
		GROUP BY v.address
	`;

  for (const row of await db.all(sql, params)) {
    stats.set(row.address, {
      blockCount: toNumber(row.block_count),
      lastMinedHeight: toNullableNumber(row.last_mined_height),
    });
  }

  return stats;
}

async function getAddress(chainId, address, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const cleanAddress = normalizeAddress(address);
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const chainHealth = await resolveChainHealth(chain, options);
  const balanceRow = await db.get(
    `
		SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count, last_seen_height,
			first_seen_height, first_seen_time
		FROM address_balances
		WHERE chain_id = ? AND address = ?
	`,
    [chain, cleanAddress]
  );
  const txRows = await db.all(
    `
		SELECT
			address_transactions.txid,
			address_transactions.first_seen_height,
			address_transactions.first_seen_time,
			COALESCE(address_transactions.net_delta_sats, 0) AS net_delta_sats,
			transactions.block_hash,
			transactions.tx_index,
			transactions.is_coinbase,
			transactions.is_coinstake
		FROM address_transactions
		INNER JOIN transactions
			ON transactions.chain_id = address_transactions.chain_id
			AND transactions.txid = address_transactions.txid
		WHERE address_transactions.chain_id = ? AND address_transactions.address = ?
		ORDER BY address_transactions.first_seen_height DESC, transactions.tx_index DESC
		LIMIT ? OFFSET ?
	`,
    [chain, cleanAddress, limit, offset]
  );
  const txTotal = balanceRow
    ? toNumber(balanceRow.tx_count)
    : toNumber(
        (
          await db.get(
            `
			SELECT COUNT(*) AS count
			FROM address_transactions
			WHERE chain_id = ? AND address = ?
		`,
            [chain, cleanAddress]
          )
        ).count
      );
  const firstSeenRow =
    balanceRow && balanceRow.first_seen_height != null
      ? {
          first_seen_height: balanceRow.first_seen_height,
          first_seen_time: balanceRow.first_seen_time,
        }
      : await db.get(
          `
			SELECT MIN(first_seen_height) AS first_seen_height, MIN(first_seen_time) AS first_seen_time
			FROM address_transactions
			WHERE chain_id = ? AND address = ?
		`,
          [chain, cleanAddress]
        );
  const balance = balanceRow
    ? mapAddressBalance(chain, balanceRow, firstSeenRow)
    : emptyAddressBalance(chain, cleanAddress, firstSeenRow);

  return {
    chainId: chain,
    address: cleanAddress,
    found: !!balanceRow,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'address'),
    balance,
    richlist:
      options.includeRank === true
        ? await getAddressRichlist(db, chain, chainHealth, balanceRow)
        : {
            enabled: chainHealth.checks.hasBlocks,
            eligible: null,
            rank: null,
            total: null,
            percentile: null,
          },
    paging: getPaging(limit, offset, txTotal),
    transactions: txRows.map((row) => mapAddressTransaction(chain, row)),
  };
}

async function getAddressRichlist(db, chain, chainHealth, balanceRow) {
  if (!chainHealth.checks.hasBlocks) {
    return {
      enabled: false,
      eligible: false,
      rank: null,
      total: 0,
      percentile: null,
    };
  }

  const total = await getFundedAddressTotal(db, chain);

  if (!balanceRow || toBigInt(balanceRow.balance_sats) <= 0n) {
    return {
      enabled: true,
      eligible: false,
      rank: null,
      total,
      percentile: null,
    };
  }

  const rankRow = await db.get(
    `
		SELECT COUNT(*) + 1 AS rank
		FROM address_balances
		WHERE chain_id = ? AND balance_sats > 0
			AND (
				balance_sats > ?
				OR (balance_sats = ? AND address < ?)
			)
	`,
    [chain, balanceRow.balance_sats, balanceRow.balance_sats, balanceRow.address]
  );
  const rank = toNumber(rankRow.rank);
  const percentile = total > 0 ? rank / total : null;

  return {
    enabled: true,
    eligible: true,
    rank,
    total,
    percentile,
  };
}

const addressActivityCategories = [
  { id: 'mined', label: 'Mined' },
  { id: 'staked', label: 'Staked' },
  { id: 'received', label: 'Received' },
  { id: 'spent', label: 'Spent' },
];

const chainActivityCategories = [
  { id: 'mined', label: 'Mined' },
  { id: 'staked', label: 'Staked' },
  { id: 'received', label: 'Transfers' },
];

function getAddressActivityCategory(row) {
  if (row.event_type === 'spend') {
    return 'spent';
  }

  if (toNumber(row.is_coinstake)) {
    return 'staked';
  }

  if (toNumber(row.is_coinbase)) {
    return 'mined';
  }

  return 'received';
}

function applyAddressEventsToActivityBucketPlan(bucketPlan, eventRows) {
  for (const row of eventRows) {
    const time = toNumber(row.time);
    const bucketIndex = findActivityBucketIndex(bucketPlan, time);
    const bucket = bucketPlan[bucketIndex];
    const delta = toBigInt(row.delta_sats);
    const magnitude = delta < 0n ? -delta : delta;
    const category = getAddressActivityCategory(row);

    if (category === 'mined') {
      bucket.minedAtomic += magnitude;
    } else if (category === 'staked') {
      bucket.stakedAtomic += magnitude;
    } else if (category === 'received') {
      bucket.receivedAtomic += magnitude;
    } else {
      bucket.spentAtomic += magnitude;
    }
  }
}

async function getAddressStatsWatermarkHeight(db, chain) {
  try {
    const row = await db.get(
      'SELECT last_height FROM rollup_state WHERE chain_id = ? AND rollup = ?',
      [chain, 'address_stats']
    );

    if (!row) {
      return null;
    }

    return toNumber(row.last_height);
  } catch {
    return null;
  }
}

async function fetchAddressEventsAfterStatsWatermark(db, chain, address, watermarkHeight, since) {
  const params = [chain, address, watermarkHeight];
  let timeClause = '';

  if (since) {
    timeClause = ' AND address_events.time >= ?';
    params.push(since);
  }

  return db.all(
    `
		SELECT
			address_events.block_height,
			address_events.time,
			address_events.delta_sats,
			address_events.event_type,
			transactions.is_coinbase,
			transactions.is_coinstake
		FROM address_events
		INNER JOIN transactions
			ON transactions.chain_id = address_events.chain_id
			AND transactions.txid = address_events.txid
		WHERE address_events.chain_id = ? AND address_events.address = ? AND address_events.block_height > ?${timeClause}
		ORDER BY address_events.time ASC, address_events.id ASC
	`,
    params
  );
}

function rebuildBalancePointsFromActivityBucketPlan(chain, bucketPlan, priorBalance) {
  let running = priorBalance;
  const rawPoints = [];

  for (const bucket of bucketPlan) {
    const delta =
      bucket.minedAtomic + bucket.stakedAtomic + bucket.receivedAtomic - bucket.spentAtomic;

    if (delta === 0n && !rawPoints.length) {
      continue;
    }

    running += delta;
    const balance = formatAtomic(chain, running);
    rawPoints.push({
      height: null,
      time: bucket.endTime,
      balanceAtomic: stringifyInteger(running),
      balance,
      balanceAmount: Number.parseFloat(balance.amount) || 0,
      ticker: balance.ticker,
    });
  }

  return rawPoints;
}

function appendLiveBalanceClosingPoint(chain, rawPoints, currentBalance) {
  const closingAtomic = stringifyInteger(currentBalance);
  const lastPoint = rawPoints[rawPoints.length - 1];

  if (lastPoint && lastPoint.balanceAtomic === closingAtomic) {
    return rawPoints;
  }

  const now = Math.floor(Date.now() / 1000);
  const closing = formatAtomic(chain, currentBalance);
  rawPoints.push({
    height: null,
    time: now,
    balanceAtomic: closingAtomic,
    balance: closing,
    balanceAmount: Number.parseFloat(closing.amount) || 0,
    ticker: closing.ticker,
  });

  return rawPoints;
}

function getTxActivityCategory(row) {
  if (toNumber(row.is_coinstake)) {
    return 'staked';
  }

  if (toNumber(row.is_coinbase)) {
    return 'mined';
  }

  return 'received';
}

function resolveActivityTimeRange(since, firstTime, lastTime) {
  const now = Math.floor(Date.now() / 1000);

  if (since) {
    return { start: since, end: now };
  }

  const end = Math.max(lastTime || now, firstTime || 0);
  const start = firstTime || end;
  return { start, end };
}

function resolveActivityBucketCount(since, maxPoints, firstTime, lastTime) {
  const { start, end } = resolveActivityTimeRange(since, firstTime, lastTime);
  const span = Math.max(end - start, 1);

  if (!since) {
    return Math.min(Math.max(maxPoints, 8), 24);
  }

  const days = Math.max(Math.ceil(span / 86_400), 1);

  if (span <= 8 * 86_400) {
    return Math.min(days, 7);
  }

  if (span <= 32 * 86_400) {
    return Math.min(days, 30);
  }

  if (span <= 95 * 86_400) {
    return Math.min(Math.ceil(days / 7), 14);
  }

  return Math.min(12, maxPoints);
}

function buildUtcDayActivityBucketPlan(since, end, maxPoints) {
  const buckets = [];
  let cursor = startOfUtcDay(since);

  while (cursor <= end) {
    const bucketEnd = Math.min(cursor + 86_400 - 1, end);
    buckets.push({
      startTime: cursor,
      endTime: bucketEnd,
      label: formatActivityBucketLabel(cursor, bucketEnd),
      minedAtomic: 0n,
      stakedAtomic: 0n,
      receivedAtomic: 0n,
      spentAtomic: 0n,
    });
    cursor += 86_400;
  }

  if (buckets.length > maxPoints) {
    return buckets.slice(buckets.length - maxPoints);
  }

  return buckets.length
    ? buckets
    : [
        {
          startTime: since,
          endTime: end,
          label: formatActivityBucketLabel(since, end),
          minedAtomic: 0n,
          stakedAtomic: 0n,
          receivedAtomic: 0n,
          spentAtomic: 0n,
        },
      ];
}

function buildActivityBucketPlan(since, maxPoints, firstTime, lastTime) {
  const { start, end } = resolveActivityTimeRange(since, firstTime, lastTime);

  if (since) {
    return buildUtcDayActivityBucketPlan(since, end, maxPoints);
  }

  const bucketCount = Math.max(
    resolveActivityBucketCount(since, maxPoints, firstTime, lastTime),
    1
  );
  const span = Math.max(end - start, 1);
  const step = Math.max(Math.floor(span / bucketCount), 1);
  const buckets = [];

  for (let index = 0; index < bucketCount; index += 1) {
    const bucketStart = index === 0 ? start : start + index * step;
    const bucketEnd = index === bucketCount - 1 ? end : start + (index + 1) * step - 1;

    buckets.push({
      startTime: bucketStart,
      endTime: bucketEnd,
      label: formatActivityBucketLabel(bucketStart, bucketEnd),
      minedAtomic: 0n,
      stakedAtomic: 0n,
      receivedAtomic: 0n,
      spentAtomic: 0n,
    });
  }

  return buckets;
}

const INSIGHTS_GROUP_BY_SECONDS = {
  day: 86_400,
  week: 7 * 86_400,
};

function normalizeInsightsGroupBy(value) {
  const allowed = ['day', 'week', 'month', 'year'];
  return allowed.includes(value) ? value : 'day';
}

function startOfUtcDay(timestamp) {
  const date = new Date(timestamp * 1000);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}

function startOfUtcWeek(timestamp) {
  const dayStart = startOfUtcDay(timestamp);
  const date = new Date(dayStart * 1000);
  const dayOfWeek = date.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return dayStart - daysSinceMonday * 86_400;
}

function startOfUtcMonth(timestamp) {
  const date = new Date(timestamp * 1000);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000);
}

function startOfUtcYear(timestamp) {
  const date = new Date(timestamp * 1000);
  return Math.floor(Date.UTC(date.getUTCFullYear(), 0, 1) / 1000);
}

function getInsightsGroupStart(timestamp, groupBy) {
  if (groupBy === 'week') {
    return startOfUtcWeek(timestamp);
  }

  if (groupBy === 'month') {
    return startOfUtcMonth(timestamp);
  }

  if (groupBy === 'year') {
    return startOfUtcYear(timestamp);
  }

  return startOfUtcDay(timestamp);
}

function advanceInsightsGroupStart(startTime, groupBy) {
  const date = new Date(startTime * 1000);

  if (groupBy === 'week') {
    return startTime + INSIGHTS_GROUP_BY_SECONDS.week;
  }

  if (groupBy === 'month') {
    return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / 1000);
  }

  if (groupBy === 'year') {
    return Math.floor(Date.UTC(date.getUTCFullYear() + 1, 0, 1) / 1000);
  }

  return startTime + INSIGHTS_GROUP_BY_SECONDS.day;
}

function endOfInsightsGroup(startTime, groupBy, rangeEnd) {
  const nextStart = advanceInsightsGroupStart(startTime, groupBy);
  return Math.min(nextStart - 1, rangeEnd);
}

function formatInsightsGroupLabel(startTime, groupBy) {
  const start = new Date(startTime * 1000);

  if (groupBy === 'year') {
    return start.toLocaleDateString('en-US', { year: 'numeric' });
  }

  if (groupBy === 'month') {
    return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  return formatChartDayLabel(startTime);
}

function buildCalendarBucketPlan(since, maxPoints, firstTime, lastTime, groupBy) {
  const now = Math.floor(Date.now() / 1000);
  const end = Math.max(lastTime || now, since || 0, firstTime || 0);
  const start = since || firstTime || end;
  let cursor = getInsightsGroupStart(start, groupBy);
  const buckets = [];

  while (cursor <= end) {
    const bucketEnd = endOfInsightsGroup(cursor, groupBy, end);
    buckets.push({
      startTime: cursor,
      endTime: bucketEnd,
      label: formatInsightsGroupLabel(cursor, groupBy),
    });
    cursor = advanceInsightsGroupStart(cursor, groupBy);
  }

  if (buckets.length > maxPoints) {
    return buckets.slice(buckets.length - maxPoints);
  }

  return buckets;
}

function formatActivityBucketLabel(startTime, endTime) {
  if (endTime != null && endTime - startTime > 86_400) {
    return `${formatChartDayLabel(startTime)} – ${formatChartDayLabel(endTime)}`;
  }

  return formatChartDayLabel(startTime);
}

function findActivityBucketIndex(buckets, time) {
  for (let index = 0; index < buckets.length; index += 1) {
    if (time >= buckets[index].startTime && time <= buckets[index].endTime) {
      return index;
    }
  }

  return buckets.length - 1;
}

function mapActivityBucket(chainId, bucket) {
  const mined = formatAtomic(chainId, bucket.minedAtomic);
  const staked = formatAtomic(chainId, bucket.stakedAtomic);
  const received = formatAtomic(chainId, bucket.receivedAtomic);
  const spentMagnitude = formatAtomic(chainId, bucket.spentAtomic);
  const unit = mined.ticker || 'VRM';
  const toChartAmount = (amount) => Number.parseFloat(amount.amount) || 0;

  return {
    startTime: bucket.startTime,
    endTime: bucket.endTime,
    label: bucket.label,
    minedAtomic: stringifyInteger(bucket.minedAtomic),
    stakedAtomic: stringifyInteger(bucket.stakedAtomic),
    receivedAtomic: stringifyInteger(bucket.receivedAtomic),
    spentAtomic: stringifyInteger(bucket.spentAtomic),
    mined,
    staked,
    received,
    spent: spentMagnitude,
    minedAmount: toChartAmount(mined),
    stakedAmount: toChartAmount(staked),
    receivedAmount: toChartAmount(received),
    spentAmount: -toChartAmount(spentMagnitude),
    ticker: unit,
  };
}

async function getAddressBalanceHistoryFromBuckets(
  db,
  chain,
  cleanAddress,
  since,
  maxPoints,
  chainHealth,
  balanceRow
) {
  const bucketCountRow = await db.get(
    `
		SELECT COUNT(*) AS count
		FROM address_balance_buckets
		WHERE chain_id = ? AND address = ?
	`,
    [chain, cleanAddress]
  );

  if (!toNumber(bucketCountRow.count)) {
    return null;
  }

  let priorBalance = 0n;
  if (since) {
    const priorFromBuckets = await db.get(
      `
			SELECT COALESCE(SUM(delta_sats), 0) AS total
			FROM address_balance_buckets
			WHERE chain_id = ? AND address = ? AND bucket_start < ?
		`,
      [chain, cleanAddress, since]
    );
    priorBalance = toBigInt(priorFromBuckets.total);
  }

  const bucketRows = since
    ? await db.all(
        `
			SELECT bucket_start, mined_sats, staked_sats, received_sats, spent_sats, delta_sats
			FROM address_balance_buckets
			WHERE chain_id = ? AND address = ? AND bucket_start >= ?
			ORDER BY bucket_start ASC
		`,
        [chain, cleanAddress, since]
      )
    : await db.all(
        `
			SELECT bucket_start, mined_sats, staked_sats, received_sats, spent_sats, delta_sats
			FROM address_balance_buckets
			WHERE chain_id = ? AND address = ?
			ORDER BY bucket_start ASC
		`,
        [chain, cleanAddress]
      );

  const boundsRow = await db.get(
    `
		SELECT MIN(bucket_start) AS min_time, MAX(bucket_start) AS max_time
		FROM address_balance_buckets
		WHERE chain_id = ? AND address = ?
	`,
    [chain, cleanAddress]
  );
  const firstTime = toNullableNumber(boundsRow.min_time);
  const lastTime = toNullableNumber(boundsRow.max_time);
  const bucketPlan = buildActivityBucketPlan(since, maxPoints, firstTime, lastTime);

  for (const row of bucketRows) {
    const time = toNumber(row.bucket_start);
    const bucketIndex = findActivityBucketIndex(bucketPlan, time);
    const bucket = bucketPlan[bucketIndex];
    bucket.minedAtomic += toBigInt(row.mined_sats);
    bucket.stakedAtomic += toBigInt(row.staked_sats);
    bucket.receivedAtomic += toBigInt(row.received_sats);
    bucket.spentAtomic += toBigInt(row.spent_sats);
  }

  const watermarkHeight = await getAddressStatsWatermarkHeight(db, chain);
  const liveEventRows =
    watermarkHeight == null
      ? []
      : await fetchAddressEventsAfterStatsWatermark(
          db,
          chain,
          cleanAddress,
          watermarkHeight,
          since
        );

  if (liveEventRows.length > 0) {
    applyAddressEventsToActivityBucketPlan(bucketPlan, liveEventRows);
  }

  let rawPoints = [];
  let running = priorBalance;

  if (liveEventRows.length > 0) {
    rawPoints = rebuildBalancePointsFromActivityBucketPlan(chain, bucketPlan, priorBalance);
    running = rawPoints.length
      ? toBigInt(rawPoints[rawPoints.length - 1].balanceAtomic)
      : priorBalance;
  } else {
    for (const row of bucketRows) {
      running += toBigInt(row.delta_sats);
      const balance = formatAtomic(chain, running);
      rawPoints.push({
        height: null,
        time: toNumber(row.bucket_start) + 3599,
        balanceAtomic: stringifyInteger(running),
        balance,
        balanceAmount: Number.parseFloat(balance.amount) || 0,
        ticker: balance.ticker,
      });
    }
  }

  const currentBalance = balanceRow ? toBigInt(balanceRow.balance_sats) : running;
  if (since) {
    appendBalanceHistoryBookends(chain, rawPoints, since, priorBalance, currentBalance);
  } else if (balanceRow) {
    appendLiveBalanceClosingPoint(chain, rawPoints, currentBalance);
  }

  const eventCountRow = await db.get(
    `
		SELECT COUNT(*) AS count
		FROM address_events
		WHERE chain_id = ? AND address = ?
	`,
    [chain, cleanAddress]
  );

  return {
    chainId: chain,
    address: cleanAddress,
    found: !!balanceRow || bucketRows.length > 0 || priorBalance !== 0n,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'address'),
    truncated: false,
    eventCount: toNumber(eventCountRow.count),
    since,
    categories: addressActivityCategories,
    buckets: bucketPlan.map((bucket) => mapActivityBucket(chain, bucket)),
    points: downsampleBalanceHistoryPoints(rawPoints, maxPoints),
    currentBalanceAtomic: balanceRow
      ? stringifyInteger(balanceRow.balance_sats)
      : stringifyInteger(running),
  };
}

async function getAddressBalanceHistory(chainId, address, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const cleanAddress = normalizeAddress(address);
  const maxPoints = normalizeBalanceHistoryPoints(options.maxPoints);
  const since = normalizeSince(options.since);
  const chainHealth = await resolveChainHealth(chain, options);
  const balanceRow = await db.get(
    `
		SELECT balance_sats
		FROM address_balances
		WHERE chain_id = ? AND address = ?
	`,
    [chain, cleanAddress]
  );
  const eventCountRow = await db.get(
    `
		SELECT COUNT(*) AS count
		FROM address_events
		WHERE chain_id = ? AND address = ?
	`,
    [chain, cleanAddress]
  );
  const eventCount = toNumber(eventCountRow.count);

  const bucketResult = await getAddressBalanceHistoryFromBuckets(
    db,
    chain,
    cleanAddress,
    since,
    maxPoints,
    chainHealth,
    balanceRow
  );
  if (bucketResult) {
    return bucketResult;
  }

  if (eventCount > maxBalanceHistoryEvents) {
    return {
      chainId: chain,
      address: cleanAddress,
      found: !!balanceRow,
      trusted: chainHealth.trusted,
      source: getSource(chainHealth, 'address'),
      truncated: true,
      eventCount,
      maxEvents: maxBalanceHistoryEvents,
      since,
      categories: addressActivityCategories,
      buckets: [],
      points: [],
      currentBalanceAtomic: balanceRow ? stringifyInteger(balanceRow.balance_sats) : '0',
    };
  }

  let priorBalance = 0n;
  if (since) {
    const priorRow = await db.get(
      `
			SELECT COALESCE(SUM(delta_sats), 0) AS total
			FROM address_events
			WHERE chain_id = ? AND address = ? AND time < ?
		`,
      [chain, cleanAddress, since]
    );
    priorBalance = toBigInt(priorRow.total);
  }

  const eventRows = since
    ? await db.all(
        `
			SELECT
				address_events.block_height,
				address_events.time,
				address_events.delta_sats,
				address_events.event_type,
				transactions.is_coinbase,
				transactions.is_coinstake
			FROM address_events
			INNER JOIN transactions
				ON transactions.chain_id = address_events.chain_id
				AND transactions.txid = address_events.txid
			WHERE address_events.chain_id = ? AND address_events.address = ? AND address_events.time >= ?
			ORDER BY address_events.time ASC, address_events.id ASC
		`,
        [chain, cleanAddress, since]
      )
    : await db.all(
        `
			SELECT
				address_events.block_height,
				address_events.time,
				address_events.delta_sats,
				address_events.event_type,
				transactions.is_coinbase,
				transactions.is_coinstake
			FROM address_events
			INNER JOIN transactions
				ON transactions.chain_id = address_events.chain_id
				AND transactions.txid = address_events.txid
			WHERE address_events.chain_id = ? AND address_events.address = ?
			ORDER BY address_events.time ASC, address_events.id ASC
		`,
        [chain, cleanAddress]
      );

  const firstTime = eventRows.length ? toNumber(eventRows[0].time) : null;
  const lastTime = eventRows.length ? toNumber(eventRows[eventRows.length - 1].time) : null;
  const bucketPlan = buildActivityBucketPlan(since, maxPoints, firstTime, lastTime);

  applyAddressEventsToActivityBucketPlan(bucketPlan, eventRows);

  const buckets = bucketPlan.map((bucket) => mapActivityBucket(chain, bucket));
  const points = buildCumulativeBalancePoints(chain, eventRows, since, maxPoints, priorBalance);
  let endingBalance = priorBalance;

  for (const row of eventRows) {
    endingBalance += toBigInt(row.delta_sats);
  }

  return {
    chainId: chain,
    address: cleanAddress,
    found: !!balanceRow || eventRows.length > 0 || priorBalance !== 0n,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'address'),
    truncated: false,
    eventCount,
    since,
    categories: addressActivityCategories,
    buckets,
    points,
    currentBalanceAtomic: balanceRow
      ? stringifyInteger(balanceRow.balance_sats)
      : stringifyInteger(endingBalance),
  };
}

function mapChainActivityBucket(bucket) {
  return {
    startTime: bucket.startTime,
    endTime: bucket.endTime,
    label: bucket.label,
    minedCount: bucket.minedCount,
    stakedCount: bucket.stakedCount,
    receivedCount: bucket.receivedCount,
    blockCount: bucket.blockCount,
  };
}

async function getChainActivityHistory(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const maxPoints = normalizeBalanceHistoryPoints(options.maxPoints);
  const since = normalizeSince(options.since);
  const bucketBounds = since
    ? await db.get(
        `
			SELECT MIN(bucket_start) AS min_time, MAX(bucket_start) AS max_time
			FROM chain_activity_buckets
			WHERE chain_id = ? AND bucket_start >= ?
		`,
        [chain, since]
      )
    : await db.get(
        `
			SELECT MIN(bucket_start) AS min_time, MAX(bucket_start) AS max_time
			FROM chain_activity_buckets
			WHERE chain_id = ?
		`,
        [chain]
      );
  const resolvedFirst = since ?? toNullableNumber(bucketBounds.min_time);
  const resolvedLast = toNullableNumber(bucketBounds.max_time);
  const bucketPlan = buildActivityBucketPlan(since, maxPoints, resolvedFirst, resolvedLast).map(
    (bucket) =>
      Object.assign({}, bucket, {
        minedCount: 0,
        stakedCount: 0,
        receivedCount: 0,
        blockCount: 0,
      })
  );

  const rangeStart = bucketPlan[0]?.startTime ?? since ?? resolvedFirst ?? 0;
  const rangeEnd = bucketPlan[bucketPlan.length - 1]?.endTime ?? resolvedLast ?? rangeStart;
  const bucketRows = await db.all(
    `
		SELECT bucket_start, mined_count, staked_count, received_count, block_count
		FROM chain_activity_buckets
		WHERE chain_id = ? AND bucket_start >= ? AND bucket_start <= ?
		ORDER BY bucket_start ASC
	`,
    [chain, rangeStart, rangeEnd + 3600]
  );

  if (bucketRows.length > 0) {
    for (const row of bucketRows) {
      const bucketIndex = findActivityBucketIndex(bucketPlan, toNumber(row.bucket_start));
      const bucket = bucketPlan[bucketIndex];
      bucket.minedCount += toNumber(row.mined_count);
      bucket.stakedCount += toNumber(row.staked_count);
      bucket.receivedCount += toNumber(row.received_count);
      bucket.blockCount += toNumber(row.block_count);
    }
  }

  return {
    chainId: chain,
    trusted: bucketRows.length > 0,
    source: { label: 'index', type: 'index' },
    since,
    categories: chainActivityCategories,
    backfillRequired: bucketRows.length === 0,
    buckets: bucketPlan.map(mapChainActivityBucket),
  };
}

async function getAddressUtxos(chainId, address, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const cleanAddress = normalizeAddress(address);
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const chainHealth = await resolveChainHealth(chain, options);
  const utxoParams = [chain, cleanAddress, chain, cleanAddress, cleanAddress];
  const summaryRow = await db.get(ADDRESS_UTXO_SUMMARY_ONLY_SQL, utxoParams);
  const rows = await db.all(ADDRESS_UTXO_LIST_SQL, [...utxoParams, limit, offset]);

  return {
    chainId: chain,
    address: cleanAddress,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'address'),
    summary: {
      utxoCount: toNumber(summaryRow.count),
      totalValueAtomic: stringifyInteger(summaryRow.total_sats),
      totalValue: formatAtomic(chain, summaryRow.total_sats),
    },
    paging: getPaging(limit, offset, summaryRow.count),
    items: rows.map((row) => ({
      txid: row.txid,
      vout: toNumber(row.n),
      valueAtomic: stringifyInteger(row.value_sats),
      value: formatAtomic(chain, row.value_sats),
      blockHeight: toNumber(row.block_height),
      time: toNumber(row.time),
    })),
  };
}

async function getTransaction(chainId, txid, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const cleanTxid = normalizeHash(txid);
  const chainHealth = await resolveChainHealth(chain, { ...options, skipAddressCount: true });
  const tx = await db.get(
    `
		SELECT txid, block_height, block_hash, tx_index, time, is_coinbase, is_coinstake, raw_available, source
		FROM transactions
		WHERE chain_id = ? AND txid = ?
	`,
    [chain, cleanTxid]
  );

  if (!tx) {
    return {
      chainId: chain,
      txid: cleanTxid,
      found: false,
      trusted: chainHealth.trusted,
      source: getSource(chainHealth, 'transaction'),
    };
  }

  const vins = (
    await db.all(
      `
		SELECT n, prev_txid, prev_vout, address, value_sats, source, resolved
		FROM vins
		WHERE chain_id = ? AND txid = ?
		ORDER BY n ASC
	`,
      [chain, cleanTxid]
    )
  ).map((row) => mapVin(chain, row));
  const vouts = (
    await db.all(
      `
		SELECT n, address, value_sats, script_type, script_pub_key, spent_by_txid, spent_by_vin, spent_height, is_spent
		FROM vouts
		WHERE chain_id = ? AND txid = ?
		ORDER BY n ASC
	`,
      [chain, cleanTxid]
    )
  ).map((row) => mapVout(chain, row));
  const addressEvents = (
    await db.all(
      `
		SELECT address, delta_sats, event_type
		FROM address_events
		WHERE chain_id = ? AND txid = ?
		ORDER BY id ASC
	`,
      [chain, cleanTxid]
    )
  ).map((row) => ({
    address: row.address,
    deltaAtomic: stringifyInteger(row.delta_sats),
    delta: formatAtomic(chain, row.delta_sats),
    eventType: row.event_type,
  }));
  const mappedTx = mapTransaction(tx);
  const totals = computeTransactionTotals(chain, vins, vouts);
  const siblings = await getTransactionSiblings(db, chain, mappedTx.blockHeight, mappedTx.txIndex);
  const changeOutputs = detectChangeOutputIndices(vins, vouts, !!toNumber(tx.is_coinbase));
  const confirmations = computeConfirmations(chainHealth, mappedTx.blockHeight);

  return {
    chainId: chain,
    found: true,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'transaction'),
    transaction: mappedTx,
    inputs: vins,
    outputs: vouts,
    addressEvents,
    totals,
    confirmations,
    siblings,
    changeOutputs,
  };
}

async function getTransactionRelatedAddresses(chainId, txid, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const cleanTxid = normalizeHash(txid);
  const limit = normalizeLimit(options.limit ?? 6);
  const chainHealth = await resolveChainHealth(chain, { ...options, skipAddressCount: true });
  const rows = await db.all(
    `
		WITH related_addresses AS (
			SELECT DISTINCT address
			FROM address_events
			WHERE chain_id = ? AND txid = ?
			UNION
			SELECT DISTINCT address
			FROM vouts
			WHERE chain_id = ? AND txid = ? AND address IS NOT NULL
			UNION
			SELECT DISTINCT vout_addresses.address
			FROM vout_addresses
			WHERE vout_addresses.chain_id = ? AND vout_addresses.txid = ?
			UNION
			SELECT DISTINCT address
			FROM vins
			WHERE chain_id = ? AND txid = ? AND address IS NOT NULL
		),
		ranked_transactions AS (
			SELECT
				address_transactions.address,
				address_transactions.txid,
				address_transactions.first_seen_height,
				address_transactions.first_seen_time,
				COALESCE(address_transactions.net_delta_sats, 0) AS net_delta_sats,
				transactions.block_hash,
				transactions.tx_index,
				transactions.is_coinbase,
				transactions.is_coinstake,
				ROW_NUMBER() OVER (
					PARTITION BY address_transactions.address
					ORDER BY address_transactions.first_seen_height DESC, transactions.tx_index DESC
				) AS row_num
			FROM address_transactions
			INNER JOIN transactions
				ON transactions.chain_id = address_transactions.chain_id
				AND transactions.txid = address_transactions.txid
			INNER JOIN related_addresses
				ON related_addresses.address = address_transactions.address
			WHERE address_transactions.chain_id = ?
		)
		SELECT
			address,
			txid,
			first_seen_height,
			first_seen_time,
			net_delta_sats,
			block_hash,
			tx_index,
			is_coinbase,
			is_coinstake
		FROM ranked_transactions
		WHERE row_num <= ?
		ORDER BY address ASC, first_seen_height DESC, tx_index DESC
	`,
    [chain, cleanTxid, chain, cleanTxid, chain, cleanTxid, chain, cleanTxid, chain, limit]
  );

  const itemsByAddress = new Map();

  for (const row of rows) {
    if (!itemsByAddress.has(row.address)) {
      itemsByAddress.set(row.address, {
        address: row.address,
        transactions: [],
      });
    }

    itemsByAddress.get(row.address).transactions.push(mapAddressTransaction(chain, row));
  }

  return {
    chainId: chain,
    txid: cleanTxid,
    found: itemsByAddress.size > 0,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'address'),
    limit,
    items: [...itemsByAddress.values()],
  };
}

async function getBlock(chainId, hashOrHeight, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const value = String(hashOrHeight || '').trim();
  const chainHealth = await resolveChainHealth(chain, {
    skipAddressCount: true,
    ...options,
  });
  const block = /^\d+$/.test(value)
    ? await db.get(
        `
			SELECT height, hash, previous_hash, next_hash, time, tx_count, size, difficulty,
				output_count, extracted_by, extracted_by_address, fee_sats, total_output_sats
			FROM blocks
			WHERE chain_id = ? AND height = ?
		`,
        [chain, Number(value)]
      )
    : await db.get(
        `
			SELECT height, hash, previous_hash, next_hash, time, tx_count, size, difficulty,
				output_count, extracted_by, extracted_by_address, fee_sats, total_output_sats
			FROM blocks
			WHERE chain_id = ? AND hash = ?
		`,
        [chain, normalizeHash(value)]
      );

  if (!block) {
    return {
      chainId: chain,
      query: value,
      found: false,
      trusted: chainHealth.trusted,
      source: getSource(chainHealth, 'block'),
    };
  }

  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const txRows = await db.all(
    `
		SELECT txid, block_height, block_hash, tx_index, time, is_coinbase, is_coinstake
		FROM transactions
		WHERE chain_id = ? AND block_height = ?
		ORDER BY tx_index ASC
		LIMIT ? OFFSET ?
	`,
    [chain, block.height, limit, offset]
  );
  const mappedBlock =
    options.skipBlockEnrichment === true
      ? mapBlock(block, chain)
      : (await enrichLatestBlocks(db, chain, [mapBlock(block, chain)]))[0];
  const transactions = await attachTransactionSummaries(
    db,
    chain,
    txRows.map((tx) => mapTransaction(tx)),
    { includeFees: options.includeTransactionFeeSummaries === true }
  );

  return {
    chainId: chain,
    found: true,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'block'),
    block: mappedBlock,
    paging: getPaging(limit, offset, block.tx_count),
    transactions,
    confirmations: computeConfirmations(chainHealth, mappedBlock.height),
    coinbase: await getCoinbaseSummary(db, chain, mappedBlock.height),
    totals: (await formatBlockTotals(db, chain, block, options)) ?? undefined,
  };
}

async function formatBlockTotals(db, chainId, blockRow, options = {}) {
  if (blockRow.total_output_sats != null) {
    const outputValueAtomic = toBigInt(blockRow.total_output_sats);
    const totals = {
      outputValueAtomic: stringifyInteger(outputValueAtomic),
      outputValue: formatAtomic(chainId, outputValueAtomic),
    };

    if (blockRow.fee_sats != null) {
      const feeAtomic = toBigInt(blockRow.fee_sats);
      totals.feeAtomic = stringifyInteger(feeAtomic);
      totals.fee = formatAtomic(chainId, feeAtomic);
    }

    return totals;
  }

  if (options.skipHeavyTotals === true) {
    return null;
  }

  return computeBlockTotals(db, chainId, blockRow.height, blockRow.tx_count);
}

function disabledResponse(chainId, chainHealth, feature) {
  return {
    chainId,
    enabled: false,
    trusted: false,
    source: getSource(chainHealth, feature),
    message: `${feature} is not available yet.`,
    health: chainHealth,
  };
}

function mapBlock(block, chainId) {
  const mapped = {
    height: toNumber(block.height),
    hash: block.hash,
    previousHash: block.previous_hash || null,
    nextHash: block.next_hash || null,
    time: toNumber(block.time),
    txCount: toNumber(block.tx_count),
    size: toNullableNumber(block.size),
    difficulty:
      block.difficulty === null || block.difficulty === undefined ? null : String(block.difficulty),
    outputCount:
      block.output_count == null
        ? block.outputCount == null
          ? null
          : toNumber(block.outputCount)
        : toNumber(block.output_count),
    extractedBy: block.extracted_by || block.extractedBy || null,
    extractedByAddress: block.extracted_by_address || block.extractedByAddress || null,
  };

  if (chainId && block.total_output_sats != null) {
    const outputValue = formatAtomic(chainId, toBigInt(block.total_output_sats));
    mapped.outputValue = outputValue;
    mapped.outputTotal = outputValue;
    mapped.mint = outputValue;
  }

  return chainId ? attachMinerLink(mapped, chainId) : mapped;
}

async function enrichLatestBlocks(db, chain, blocks) {
  if (!blocks.length) {
    return blocks;
  }

  const fullyEnriched = blocks.every(
    (block) => block.outputCount != null && (chain !== 'vrm' || block.extractedBy)
  );

  if (fullyEnriched) {
    return blocks;
  }

  return enrichBlocks(db, chain, blocks);
}

async function enrichBlockInterestRates(chainId, blocks, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);

  if (chain !== 'vrc' || !Array.isArray(blocks) || !blocks.length) {
    return blocks;
  }

  const blocksNeedingRate = blocks.filter(
    (block) => block.interestRatePercent == null && block.time != null
  );

  if (!blocksNeedingRate.length) {
    return blocks;
  }

  const bucketStarts = [
    ...new Set(blocksNeedingRate.map((block) => hourBucketStart(toNumber(block.time)))),
  ];
  const minBucket = Math.min(...bucketStarts);
  const maxBucket = Math.max(...bucketStarts);
  const metricRows = await db.all(
    `
		SELECT bucket_start, interest_rate_percent
		FROM network_metric_buckets
		WHERE chain_id = ?
			AND bucket_start <= ?
			AND bucket_start >= ?
			AND interest_rate_percent IS NOT NULL
		ORDER BY bucket_start ASC
	`,
    [chain, maxBucket, minBucket]
  );

  const rateByBucket = new Map();
  let metricIndex = 0;
  let latestRate = null;

  for (const bucketStart of bucketStarts.sort((a, b) => a - b)) {
    while (
      metricIndex < metricRows.length &&
      toNumber(metricRows[metricIndex].bucket_start) <= bucketStart
    ) {
      latestRate = Number(metricRows[metricIndex].interest_rate_percent);
      metricIndex += 1;
    }

    rateByBucket.set(bucketStart, latestRate);
  }

  return blocks.map((block) => {
    if (block.interestRatePercent != null || block.time == null) {
      return block;
    }

    const bucketStart = hourBucketStart(toNumber(block.time));
    const interestRatePercent = rateByBucket.get(bucketStart) ?? null;

    return Object.assign({}, block, {
      interestRatePercent: Number.isFinite(interestRatePercent) ? interestRatePercent : null,
    });
  });
}

async function enrichBlocks(db, chain, blocks) {
  if (!blocks.length) {
    return blocks;
  }

  const heights = blocks.map((block) => block.height);
  const placeholders = heights.map(() => '?').join(',');
  const outputCounts = await db.all(
    `
		SELECT t.block_height AS height, COUNT(*) AS count
		FROM vouts v
		INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
		WHERE v.chain_id = ? AND t.block_height IN (${placeholders})
		GROUP BY t.block_height
	`,
    [chain, ...heights]
  );
  const outputCountByHeight = Object.fromEntries(
    outputCounts.map((row) => [row.height, toNumber(row.count)])
  );

  const coinbaseVouts = await db.all(
    `
		SELECT t.block_height AS height, t.txid, v.n, v.address, v.value_sats
		FROM vouts v
		INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
		WHERE v.chain_id = ? AND t.block_height IN (${placeholders}) AND t.is_coinbase = 1
		ORDER BY t.block_height DESC, v.n ASC
	`,
    [chain, ...heights]
  );
  const coinbaseRawByHeight = Object.fromEntries(
    (
      await db.all(
        `
			SELECT block_height AS height, raw_json
			FROM transactions
			WHERE chain_id = ? AND block_height IN (${placeholders}) AND is_coinbase = 1
		`,
        [chain, ...heights]
      )
    ).map((row) => [row.height, row.raw_json])
  );
  const coinbaseVoutsByHeight = {};

  for (const row of coinbaseVouts) {
    if (!coinbaseVoutsByHeight[row.height]) {
      coinbaseVoutsByHeight[row.height] = [];
    }
    coinbaseVoutsByHeight[row.height].push(row);
  }

  return blocks.map((block) => {
    const coinbaseRows = coinbaseVoutsByHeight[block.height] || [];
    const coinbaseRaw = coinbaseRawByHeight[block.height] || null;
    const miner =
      coinbaseRows.length > 0
        ? identifyMinerFromVouts(coinbaseRows, block, chain, coinbaseRaw)
        : null;
    const mapped = mapMinerFields(miner);
    const enriched = Object.assign({}, block, {
      outputCount: block.outputCount ?? outputCountByHeight[block.height] ?? null,
      extractedBy: block.extractedBy || mapped.extractedBy || null,
      extractedByAddress: mapped.extractedBy
        ? null
        : block.extractedByAddress || mapped.extractedByAddress || null,
    });

    return attachMinerLink(enriched, chain);
  });
}

function identifyMinerFromVouts(vouts, block, chainId, coinbaseRawJson) {
  if (coinbaseRawJson) {
    try {
      const coinbaseTx = JSON.parse(coinbaseRawJson);
      const miner = utils.identifyMiner(coinbaseTx, block.height, chainIdToTicker(chainId));
      if (miner) {
        return miner;
      }
    } catch {
      /* fall through to vout reconstruction */
    }
  }

  const coinbaseTx = {
    blockhash: block.hash,
    vin: [{ coinbase: '00' }],
    vout: vouts.map((row) => ({
      n: row.n,
      value: Number(row.value_sats) / 100000000,
      scriptPubKey: row.address ? { address: row.address } : {},
    })),
  };

  return utils.identifyMiner(coinbaseTx, block.height, chainIdToTicker(chainId));
}

function mapTransaction(tx) {
  return {
    txid: tx.txid,
    blockHeight: toNumber(tx.block_height),
    blockHash: tx.block_hash,
    txIndex: toNumber(tx.tx_index),
    time: toNumber(tx.time),
    isCoinbase: !!toNumber(tx.is_coinbase),
    isCoinstake: !!toNumber(tx.is_coinstake),
    rawAvailable: tx.raw_available === undefined ? undefined : !!toNumber(tx.raw_available),
    source: tx.source || 'index',
  };
}

function mapAddressBalance(chainId, row, firstSeenRow) {
  return Object.assign(mapAddressBalanceCore(chainId, row), mapAddressLifecycle(firstSeenRow, row));
}

function mapAddressBalanceCore(chainId, row) {
  return {
    address: row.address,
    balanceAtomic: stringifyInteger(row.balance_sats),
    balance: formatAtomic(chainId, row.balance_sats),
    totalReceivedAtomic: stringifyInteger(row.total_received_sats),
    totalReceived: formatAtomic(chainId, row.total_received_sats),
    totalSentAtomic: stringifyInteger(row.total_sent_sats),
    totalSent: formatAtomic(chainId, row.total_sent_sats),
    txCount: toNumber(row.tx_count),
    lastSeenHeight: toNullableNumber(row.last_seen_height),
  };
}

function mapAddressLifecycle(firstSeenRow, balanceRow) {
  return {
    firstSeenHeight: firstSeenRow ? toNullableNumber(firstSeenRow.first_seen_height) : null,
    firstSeenTime: firstSeenRow ? toNullableNumber(firstSeenRow.first_seen_time) : null,
    lastSeenHeight: balanceRow ? toNullableNumber(balanceRow.last_seen_height) : null,
  };
}

function emptyAddressBalance(chainId, address, firstSeenRow) {
  return Object.assign(
    mapAddressBalanceCore(chainId, {
      address,
      balance_sats: 0n,
      total_received_sats: 0n,
      total_sent_sats: 0n,
      tx_count: 0,
      last_seen_height: null,
    }),
    mapAddressLifecycle(firstSeenRow, null)
  );
}

function buildCumulativeBalancePoints(chain, eventRows, since, maxPoints, priorBalance) {
  let running = priorBalance;
  const rawPoints = [];

  for (const row of eventRows) {
    running += toBigInt(row.delta_sats);
    const balance = formatAtomic(chain, running);
    rawPoints.push({
      height: toNumber(row.block_height),
      time: toNumber(row.time),
      balanceAtomic: stringifyInteger(running),
      balance,
      balanceAmount: Number.parseFloat(balance.amount) || 0,
      ticker: balance.ticker,
    });
  }

  if (since) {
    appendBalanceHistoryBookends(chain, rawPoints, since, priorBalance, running);
  }

  return downsampleBalanceHistoryPoints(rawPoints, maxPoints);
}

function appendBalanceHistoryBookends(chain, rawPoints, since, priorBalance, currentBalance) {
  if (!since) {
    return rawPoints;
  }

  const now = Math.floor(Date.now() / 1000);
  const hasOpening = rawPoints.some((point) => point.time <= since);

  if (!hasOpening) {
    const opening = formatAtomic(chain, priorBalance);
    rawPoints.unshift({
      height: null,
      time: since,
      balanceAtomic: stringifyInteger(priorBalance),
      balance: opening,
      balanceAmount: Number.parseFloat(opening.amount) || 0,
      ticker: opening.ticker,
    });
  }

  const closing = formatAtomic(chain, currentBalance);
  const closingAtomic = stringifyInteger(currentBalance);
  const lastPoint = rawPoints[rawPoints.length - 1];

  if (!lastPoint || lastPoint.time < now - 1 || lastPoint.balanceAtomic !== closingAtomic) {
    rawPoints.push({
      height: null,
      time: now,
      balanceAtomic: closingAtomic,
      balance: closing,
      balanceAmount: Number.parseFloat(closing.amount) || 0,
      ticker: closing.ticker,
    });
  }

  return rawPoints;
}

function downsampleBalanceHistoryPoints(points, maxPoints) {
  if (!points.length || points.length <= maxPoints) {
    return points;
  }

  const sampled = [];
  const lastIndex = points.length - 1;

  for (let i = 0; i < maxPoints; i += 1) {
    const index = i === maxPoints - 1 ? lastIndex : Math.floor((i * lastIndex) / (maxPoints - 1));
    sampled.push(points[index]);
  }

  return sampled;
}

function normalizeBalanceHistoryPoints(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultBalanceHistoryPoints;
  }

  return Math.min(Math.max(Math.floor(parsed), 2), maxBalanceHistoryPoints);
}

function normalizeSince(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function mapAddressTransaction(chainId, row) {
  return {
    txid: row.txid,
    blockHeight: toNumber(row.first_seen_height),
    blockHash: row.block_hash,
    txIndex: toNumber(row.tx_index),
    time: toNumber(row.first_seen_time),
    netDeltaAtomic: stringifyInteger(row.net_delta_sats || 0n),
    netDelta: formatAtomic(chainId, row.net_delta_sats || 0n),
    isCoinbase: !!toNumber(row.is_coinbase),
    isCoinstake: !!toNumber(row.is_coinstake),
  };
}

function mapVin(chainId, row) {
  return {
    n: toNumber(row.n),
    prevTxid: row.prev_txid || null,
    prevVout: toNullableNumber(row.prev_vout),
    address: row.address || null,
    valueAtomic: row.value_sats === null ? null : stringifyInteger(row.value_sats),
    value: row.value_sats === null ? null : formatAtomic(chainId, row.value_sats),
    source: row.source,
    resolved: !!toNumber(row.resolved),
  };
}

function mapVout(chainId, row) {
  return {
    n: toNumber(row.n),
    address: row.address || null,
    valueAtomic: stringifyInteger(row.value_sats),
    value: formatAtomic(chainId, row.value_sats),
    scriptType: row.script_type || null,
    scriptPubKey: row.script_pub_key || null,
    spentByTxid: row.spent_by_txid || null,
    spentByVin: toNullableNumber(row.spent_by_vin),
    spentHeight: toNullableNumber(row.spent_height),
    isSpent: !!toNumber(row.is_spent),
  };
}

function getSource(chainHealth, feature) {
  const sourceLabel =
    chainHealth.sourceLabels &&
    (chainHealth.sourceLabels[feature] ||
      (feature === 'address' ? chainHealth.sourceLabels.addressBalances : null) ||
      (feature === 'summary' ? chainHealth.sourceLabels.blocks : null));

  return {
    label: sourceLabel || 'index',
    trustLevel: chainHealth.trustLevel,
    healthStatus: chainHealth.status,
    message: chainHealth.message,
  };
}

function getPaging(limit, offset, total) {
  const count = toNumber(total || 0);

  return {
    limit,
    offset,
    total: count,
    hasMore: offset + limit < count,
  };
}

function formatAtomic(chainId, value) {
  const unit = getChainUnit(chainId);

  return {
    amount: atomicUnitsToDecimal(value, unit.decimalPlaces),
    ticker: unit.ticker,
    decimalPlaces: unit.decimalPlaces,
  };
}

function getChainUnit(chainId) {
  return (
    chainUnits[chainId] || {
      ticker: chainId.toUpperCase(),
      decimalPlaces: 8,
    }
  );
}

function normalizeChainId(chainId) {
  const value = String(chainId || '')
    .trim()
    .toLowerCase();

  if (!value || !chainUnits[value]) {
    throw new Error(`Unknown chain: ${chainId}`);
  }

  return value;
}

function normalizeAddress(address) {
  const value = String(address || '').trim();

  if (!value) {
    throw new Error('Address is required.');
  }

  return value;
}

function normalizeHash(hash) {
  const value = String(hash || '').trim();

  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('Expected a 64-character hex hash.');
  }

  return value.toLowerCase();
}

function normalizeLimit(value) {
  const limit = Number(value || defaultLimit);

  if (!Number.isFinite(limit) || limit < 1) {
    return defaultLimit;
  }

  return Math.min(Math.floor(limit), maxLimit);
}

function normalizePeriod(value) {
  const period = String(value || 'week')
    .trim()
    .toLowerCase();

  if (['week', 'month'].includes(period)) {
    return period;
  }

  return 'week';
}

function normalizeMinersPeriod(value) {
  const period = String(value || 'month')
    .trim()
    .toLowerCase();

  if (period === '7d') {
    return 'week';
  }

  if (period === '30d') {
    return 'month';
  }

  if (['week', 'month', 'year', 'all', '90d'].includes(period)) {
    return period;
  }

  return 'month';
}

function getRollingPeriodBounds(days, nowSec) {
  const since = nowSec - days * 86_400;

  return {
    start: since,
    end: nowSec,
    since,
    startIso: new Date(since * 1000).toISOString(),
    endIso: new Date(nowSec * 1000).toISOString(),
  };
}

function getMinersPeriodBounds(period, nowValue) {
  const nowSec = Math.floor((nowValue ? new Date(nowValue) : new Date()).getTime() / 1000);

  if (period === 'all') {
    return {
      type: 'all',
      start: null,
      end: nowSec,
      since: null,
      startIso: null,
      endIso: new Date(nowSec * 1000).toISOString(),
    };
  }

  if (period === 'week') {
    return {
      type: 'week',
      ...getRollingPeriodBounds(7, nowSec),
    };
  }

  if (period === 'month') {
    return {
      type: 'month',
      ...getRollingPeriodBounds(30, nowSec),
    };
  }

  if (period === 'year') {
    return {
      type: 'year',
      ...getRollingPeriodBounds(365, nowSec),
    };
  }

  if (period === '90d') {
    return {
      type: '90d',
      ...getRollingPeriodBounds(90, nowSec),
    };
  }

  return {
    type: 'month',
    ...getRollingPeriodBounds(30, nowSec),
  };
}

function normalizeLeaderboardSort(value) {
  const sort = String(value || 'net')
    .trim()
    .toLowerCase();

  if (['received', 'sent', 'net', 'activity'].includes(sort)) {
    return sort;
  }

  return 'net';
}

function getPeriodBounds(period, nowValue) {
  const now = nowValue ? new Date(nowValue) : new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (period === 'month') {
    start.setUTCDate(1);
  } else {
    const day = start.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  }

  const end = new Date(start.getTime());
  if (period === 'month') {
    end.setUTCMonth(end.getUTCMonth() + 1);
  } else {
    end.setUTCDate(end.getUTCDate() + 7);
  }

  return {
    type: period,
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function normalizeOffset(value) {
  const offset = Number(value || 0);

  if (!Number.isFinite(offset) || offset < 0) {
    return 0;
  }

  return Math.floor(offset);
}

function stringifyInteger(value) {
  return String(value === null || value === undefined ? 0 : value);
}

function toBigInt(value) {
  if (value === null || value === undefined) {
    return 0n;
  }

  return typeof value === 'bigint' ? value : BigInt(value);
}

function computeTransactionTotals(chainId, vins, vouts) {
  let inputAtomic = 0n;
  let outputAtomic = 0n;

  for (const vin of vins) {
    if (vin.resolved && vin.valueAtomic !== null && vin.valueAtomic !== undefined) {
      inputAtomic += toBigInt(vin.valueAtomic);
    }
  }

  for (const vout of vouts) {
    outputAtomic += toBigInt(vout.valueAtomic);
  }

  const feeAtomic = inputAtomic >= outputAtomic ? inputAtomic - outputAtomic : 0n;

  return {
    inputAtomic: stringifyInteger(inputAtomic),
    outputAtomic: stringifyInteger(outputAtomic),
    feeAtomic: stringifyInteger(feeAtomic),
    input: formatAtomic(chainId, inputAtomic),
    output: formatAtomic(chainId, outputAtomic),
    fee: formatAtomic(chainId, feeAtomic),
  };
}

function computeConfirmations(chainHealth, blockHeight) {
  const tip =
    chainHealth.heights.bestRpcHeight ??
    chainHealth.heights.lastIndexedHeight ??
    chainHealth.heights.maxIndexedHeight;

  if (tip === null || tip === undefined || blockHeight === null || blockHeight === undefined) {
    return null;
  }

  return Math.max(1, toNumber(tip) - toNumber(blockHeight) + 1);
}

async function getTransactionSiblings(db, chainId, blockHeight, txIndex) {
  const currentIndex = toNumber(txIndex);
  const prevIndex = currentIndex - 1;
  const nextIndex = currentIndex + 1;
  const siblings = {
    prevTxid: null,
    nextTxid: null,
  };

  const indices = [];
  if (prevIndex >= 0) {
    indices.push(prevIndex);
  }

  indices.push(nextIndex);

  const placeholders = indices.map(() => '?').join(',');
  const rows = await db.all(
    `
		SELECT tx_index, txid
		FROM transactions
		WHERE chain_id = ? AND block_height = ? AND tx_index IN (${placeholders})
	`,
    [chainId, blockHeight, ...indices]
  );

  for (const row of rows) {
    if (toNumber(row.tx_index) === prevIndex) {
      siblings.prevTxid = row.txid;
    } else if (toNumber(row.tx_index) === nextIndex) {
      siblings.nextTxid = row.txid;
    }
  }

  return siblings;
}

function detectChangeOutputIndices(vins, vouts, isCoinbase) {
  if (isCoinbase) {
    return [];
  }

  const inputAddresses = new Set(vins.map((vin) => vin.address).filter(Boolean));

  return vouts
    .filter((vout) => vout.address && inputAddresses.has(vout.address))
    .map((vout) => vout.n);
}

async function getCoinbaseSummary(db, chainId, blockHeight) {
  const row = await db.get(
    `
		SELECT
			transactions.txid,
			transactions.tx_index,
			COALESCE(SUM(vouts.value_sats), 0) AS reward_sats
		FROM transactions
		LEFT JOIN vouts
			ON vouts.chain_id = transactions.chain_id
			AND vouts.txid = transactions.txid
		WHERE transactions.chain_id = ?
			AND transactions.block_height = ?
			AND transactions.is_coinbase = 1
		GROUP BY transactions.txid, transactions.tx_index
		ORDER BY transactions.tx_index ASC
		LIMIT 1
	`,
    [chainId, blockHeight]
  );

  if (!row) {
    return null;
  }

  const rewardAtomic = toBigInt(row.reward_sats);

  return {
    txid: row.txid,
    rewardAtomic: stringifyInteger(rewardAtomic),
    reward: formatAtomic(chainId, rewardAtomic),
  };
}

async function computeBlockTotals(db, chainId, blockHeight, txCount = 0) {
  const totals = await computeBlockTotalsRawAsync(db, chainId, blockHeight, txCount);
  const outputValueAtomic = totals.totalOutputSats;

  const feeAtomic = totals.feeSats === null ? 0n : totals.feeSats;

  return {
    feeAtomic: stringifyInteger(feeAtomic),
    fee: formatAtomic(chainId, feeAtomic),
    outputValueAtomic: stringifyInteger(outputValueAtomic),
    outputValue: formatAtomic(chainId, outputValueAtomic),
  };
}

async function attachTransactionSummaries(db, chainId, transactions, options = {}) {
  if (!transactions.length) {
    return transactions;
  }

  const includeFees = options.includeFees === true;
  const txids = transactions.map((tx) => tx.txid);
  const placeholders = txids.map(() => '?').join(',');
  const outputStats = await db.all(
    `
		SELECT txid, COUNT(*) AS output_count, COALESCE(SUM(value_sats), 0) AS output_sats
		FROM vouts
		WHERE chain_id = ? AND txid IN (${placeholders})
		GROUP BY txid
	`,
    [chainId, ...txids]
  );
  const statsByTxid = Object.fromEntries(outputStats.map((row) => [row.txid, row]));

  const nonCoinbaseTxids = includeFees
    ? transactions.filter((tx) => !tx.isCoinbase).map((tx) => tx.txid)
    : [];
  const inputStatsByTxid = {};
  if (nonCoinbaseTxids.length > 0) {
    const inputPlaceholders = nonCoinbaseTxids.map(() => '?').join(',');
    const inputStats = await db.all(
      `
			SELECT txid, COALESCE(SUM(value_sats), 0) AS total
			FROM vins
			WHERE chain_id = ? AND txid IN (${inputPlaceholders}) AND resolved = 1
			GROUP BY txid
		`,
      [chainId, ...nonCoinbaseTxids]
    );
    for (const row of inputStats) {
      inputStatsByTxid[row.txid] = row.total;
    }
  }

  return transactions.map((tx) => {
    const stats = statsByTxid[tx.txid];
    const summary = {
      outputCount: stats ? toNumber(stats.output_count) : 0,
      totalOutputAtomic: stats ? stringifyInteger(stats.output_sats) : '0',
      totalOutput: formatAtomic(chainId, stats ? stats.output_sats : 0),
    };

    if (!tx.isCoinbase) {
      const inputAtomic = toBigInt(inputStatsByTxid[tx.txid] || 0);
      const outputAtomic = toBigInt(stats ? stats.output_sats : 0);
      if (inputAtomic >= outputAtomic) {
        summary.feeAtomic = stringifyInteger(inputAtomic - outputAtomic);
        summary.fee = formatAtomic(chainId, inputAtomic - outputAtomic);
      }
    }

    return Object.assign({}, tx, { summary });
  });
}

function toNullableNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return toNumber(value);
}

function mapNetworkMetricBucket(bucket) {
  return {
    startTime: bucket.startTime,
    endTime: bucket.endTime,
    label: bucket.label,
    difficulty: bucket.difficulty,
    blockHeight: bucket.blockHeight,
    supply: bucket.supply,
    hashrateKhPerMin: bucket.hashrateKhPerMin,
    interestRatePercent: bucket.interestRatePercent,
    netStakeWeight: bucket.netStakeWeight,
    percentStaked: bucket.percentStaked,
    expectedStakeTimeSeconds: bucket.expectedStakeTimeSeconds,
    addressCount: bucket.addressCount,
  };
}

async function getNetworkMetricHistory(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const maxPoints = normalizeBalanceHistoryPoints(options.maxPoints);
  const since = normalizeSince(options.since);
  const groupBy = options.groupBy ? normalizeInsightsGroupBy(options.groupBy) : null;
  const chainHealth = await resolveChainHealth(chain, options);
  const bucketBounds = since
    ? await db.get(
        `
			SELECT MIN(bucket_start) AS min_time, MAX(bucket_start) AS max_time
			FROM network_metric_buckets
			WHERE chain_id = ? AND bucket_start >= ?
		`,
        [chain, since]
      )
    : await db.get(
        `
			SELECT MIN(bucket_start) AS min_time, MAX(bucket_start) AS max_time
			FROM network_metric_buckets
			WHERE chain_id = ?
		`,
        [chain]
      );
  const resolvedFirst = toNullableNumber(bucketBounds.min_time) ?? since ?? null;
  const resolvedLast = toNullableNumber(bucketBounds.max_time);
  const bucketPlanSource = groupBy
    ? buildCalendarBucketPlan(since, maxPoints, resolvedFirst, resolvedLast, groupBy)
    : buildActivityBucketPlan(since, maxPoints, resolvedFirst, resolvedLast);
  const bucketPlan = bucketPlanSource.map((bucket) =>
    Object.assign({}, bucket, {
      difficulty: null,
      blockHeight: null,
      supply: null,
      hashrateKhPerMin: null,
      interestRatePercent: null,
      netStakeWeight: null,
      percentStaked: null,
      expectedStakeTimeSeconds: null,
      addressCount: null,
    })
  );

  const rangeStart = bucketPlan[0]?.startTime ?? since ?? resolvedFirst ?? 0;
  const rangeEnd = bucketPlan[bucketPlan.length - 1]?.endTime ?? resolvedLast ?? rangeStart;
  const bucketRows = await db.all(
    `
		SELECT bucket_start, difficulty, block_height, supply, hashrate_kh_per_min,
			interest_rate_percent, net_stake_weight, percent_staked,
			expected_stake_time_seconds, address_count
		FROM network_metric_buckets
		WHERE chain_id = ? AND bucket_start >= ? AND bucket_start <= ?
		ORDER BY bucket_start ASC
	`,
    [chain, rangeStart, rangeEnd + 3600]
  );

  if (bucketRows.length > 0) {
    for (const row of bucketRows) {
      const bucketIndex = findActivityBucketIndex(bucketPlan, toNumber(row.bucket_start));
      const bucket = bucketPlan[bucketIndex];
      if (row.difficulty != null) bucket.difficulty = Number(row.difficulty);
      if (row.block_height != null) bucket.blockHeight = toNumber(row.block_height);
      if (row.supply != null) bucket.supply = Number(row.supply);
      if (row.hashrate_kh_per_min != null)
        bucket.hashrateKhPerMin = Number(row.hashrate_kh_per_min);
      if (row.interest_rate_percent != null)
        bucket.interestRatePercent = Number(row.interest_rate_percent);
      if (row.net_stake_weight != null) bucket.netStakeWeight = Number(row.net_stake_weight);
      if (row.percent_staked != null) bucket.percentStaked = Number(row.percent_staked);
      if (row.expected_stake_time_seconds != null) {
        bucket.expectedStakeTimeSeconds = toNumber(row.expected_stake_time_seconds);
      }
      if (row.address_count != null) bucket.addressCount = toNumber(row.address_count);
    }
  }

  return {
    chainId: chain,
    trusted: bucketRows.length > 0 ? chainHealth.trusted : false,
    source: getSource(chainHealth, 'summary'),
    since,
    groupBy,
    backfillRequired: bucketRows.length === 0,
    availableSince: resolvedFirst,
    buckets: bucketPlan.map(mapNetworkMetricBucket),
  };
}

function toNumber(value) {
  return typeof value === 'bigint' ? Number(value) : Number(value);
}

async function getIndexedHashrate7dAvg(chainId, options = {}) {
  const chain = normalizeChainId(chainId);

  if (chain !== 'vrm') {
    return { chainId: chain, hashrate7dKhPerMin: null, sampleCount: 0 };
  }

  const db = options.db || dbModule.openDatabase();
  const since = Math.floor(Date.now() / 1000) - 7 * 86400;
  const row = await db.get(
    `
		SELECT AVG(CAST(difficulty AS DOUBLE PRECISION)) AS avg_difficulty, COUNT(*) AS sample_count
		FROM blocks
		WHERE chain_id = ? AND status = 'main' AND time >= ? AND difficulty IS NOT NULL
	`,
    [chain, since]
  );

  if (!row?.sample_count || row.avg_difficulty == null) {
    return { chainId: chain, hashrate7dKhPerMin: null, sampleCount: 0 };
  }

  const avgDifficulty = Number(row.avg_difficulty);
  if (!Number.isFinite(avgDifficulty) || avgDifficulty <= 0) {
    return { chainId: chain, hashrate7dKhPerMin: null, sampleCount: 0 };
  }

  const hashPerSec = difficultyToHashPerSec(avgDifficulty, chain);
  const hashrate7dKhPerMin = hashPerSec != null ? hashPerSecToKhPerMin(hashPerSec) : null;

  return {
    chainId: chain,
    hashrate7dKhPerMin,
    sampleCount: toNumber(row.sample_count),
  };
}

async function getIndexedSupplyAtHeight(chainId, options = {}) {
  const chain = normalizeChainId(chainId);
  const db = options.db || dbModule.openDatabase();
  const height = Number(options.height);

  if (!Number.isFinite(height) || height < 0) {
    return { chainId: chain, height: null, supply: null };
  }

  const supply = await indexedSupplyAtHeight(db, chain, height);

  return {
    chainId: chain,
    height,
    supply: typeof supply === 'number' && Number.isFinite(supply) && supply > 0 ? supply : null,
  };
}

const VERIUM_POOL_PAYOUT_ADDRESS = 'VRq98Nm2P6anLHPgnHdb6NnibJ6GoG3Jm9';
const VERIUM_POOL_DISPLAY_NAME = 'Verium Pool';
const MINERS_TREND_OTHERS_ID = '__others__';

function resolveMinersTrendGroupBy(period) {
  if (period === 'week' || period === 'month') {
    return 'day';
  }

  return 'week';
}

function formatMinerChartLabel(address) {
  if (address === VERIUM_POOL_PAYOUT_ADDRESS) {
    return VERIUM_POOL_DISPLAY_NAME;
  }

  if (typeof address !== 'string' || address.length <= 14) {
    return address || 'Unknown';
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function buildMinersTrendBuckets(rangeStart, rangeEnd, groupBy, maxPoints) {
  const start = getInsightsGroupStart(rangeStart, groupBy);
  const buckets = [];
  let cursor = start;

  while (cursor <= rangeEnd && buckets.length < maxPoints) {
    const endTime = endOfInsightsGroup(cursor, groupBy, rangeEnd);
    buckets.push({
      startTime: cursor,
      endTime,
      label: formatInsightsGroupLabel(cursor, groupBy),
      groupStart: cursor,
    });
    cursor = advanceInsightsGroupStart(cursor, groupBy);
  }

  if (buckets.length > maxPoints) {
    return buckets.slice(buckets.length - maxPoints);
  }

  return buckets;
}

function findMinersTrendBucketIndex(buckets, dayStart, groupBy) {
  const groupStart = getInsightsGroupStart(dayStart, groupBy);
  return buckets.findIndex((bucket) => bucket.groupStart === groupStart);
}

async function queryMinerDailyBlocks(db, chain, since, sinceHeight) {
  const hasRollup = await db.get(
    'SELECT 1 AS present FROM miner_stats WHERE chain_id = ? LIMIT 1',
    [chain]
  );

  if (hasRollup) {
    const sinceDay = since == null ? null : Math.floor(since / 86_400) * 86_400;
    const filterSql = sinceDay == null ? 'chain_id = ?' : 'chain_id = ? AND day_start >= ?';
    const filterParams = sinceDay == null ? [chain] : [chain, sinceDay];

    return db.all(
      `
			SELECT address, day_start, blocks_mined
			FROM miner_stats
			WHERE ${filterSql}
				AND blocks_mined > 0
		`,
      filterParams
    );
  }

  if (since != null && sinceHeight == null) {
    return [];
  }

  const period = buildMinedPeriodFilter(since, sinceHeight);

  return db.all(
    `
		SELECT
			v.address AS address,
			(b.time / 86400) * 86400 AS day_start,
			COUNT(DISTINCT t.block_height) AS blocks_mined
		FROM transactions t
		INNER JOIN vouts v
			ON v.chain_id = t.chain_id
			AND v.txid = v.txid
		INNER JOIN blocks b
			ON b.chain_id = t.chain_id
			AND b.height = t.block_height
			AND b.status = 'main'
		WHERE t.chain_id = ?
			AND t.is_coinbase = 1
			AND t.block_height != ?
			AND v.value_sats > 0
			AND v.address IS NOT NULL
			${period.sql}
		GROUP BY v.address, (b.time / 86400) * 86400
		HAVING COUNT(DISTINCT t.block_height) > 0
	`,
    [chain, MINERS_EXCLUDED_BLOCK_HEIGHT, ...period.params]
  );
}

async function getMinerShareTrend(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const period = normalizeMinersPeriod(options.period);
  const topN = Math.min(Math.max(toNumber(options.top) || 10, 1), 15);
  const maxPoints = Math.min(Math.max(toNumber(options.maxPoints) || 60, 8), 120);
  const groupBy = resolveMinersTrendGroupBy(period);
  const chainHealth = await resolveChainHealth(chain, options);

  if (chain !== 'vrm') {
    return {
      chainId: chain,
      enabled: false,
      trusted: false,
      source: getSource(chainHealth, 'leaderboards'),
      message: 'Miner share trends are only available for Verium (VRM).',
      series: [],
      points: [],
    };
  }

  if (!chainHealth.checks.hasBlocks) {
    return Object.assign(disabledResponse(chain, chainHealth, 'leaderboards'), {
      series: [],
      points: [],
    });
  }

  const periodBounds = getMinersPeriodBounds(period, options.now);
  const since = periodBounds.since;
  const sinceHeight = since == null ? null : await resolveMinedSinceHeight(db, chain, since);
  const rows = await queryMinerDailyBlocks(db, chain, since, sinceHeight);

  if (!rows.length) {
    return {
      chainId: chain,
      trusted: chainHealth.trusted,
      source: getSource(chainHealth, 'leaderboards'),
      period: periodBounds,
      groupBy,
      series: [],
      points: [],
    };
  }

  const totalsByAddress = new Map();
  for (const row of rows) {
    totalsByAddress.set(
      row.address,
      (totalsByAddress.get(row.address) || 0) + toNumber(row.blocks_mined)
    );
  }

  const topAddresses = [...totalsByAddress.entries()]
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .slice(0, topN)
    .map(([address]) => address);
  const topSet = new Set(topAddresses);

  let rangeStart = since;
  if (rangeStart == null) {
    rangeStart = Math.min(...rows.map((row) => toNumber(row.day_start)));
  }
  const rangeEnd = periodBounds.end;
  const buckets = buildMinersTrendBuckets(rangeStart, rangeEnd, groupBy, maxPoints);
  const bucketTotals = buckets.map(() => ({ miners: {} }));

  for (const row of rows) {
    const bucketIndex = findMinersTrendBucketIndex(buckets, toNumber(row.day_start), groupBy);
    if (bucketIndex < 0) {
      continue;
    }

    const blocks = toNumber(row.blocks_mined);
    const key = topSet.has(row.address) ? row.address : MINERS_TREND_OTHERS_ID;
    bucketTotals[bucketIndex].miners[key] =
      (bucketTotals[bucketIndex].miners[key] || 0) + blocks;
  }

  const series = topAddresses.map((address) => ({
    id: address,
    address,
    label: formatMinerChartLabel(address),
  }));

  const hasOthers = bucketTotals.some(
    (bucket) => (bucket.miners[MINERS_TREND_OTHERS_ID] || 0) > 0
  );
  if (hasOthers) {
    series.push({
      id: MINERS_TREND_OTHERS_ID,
      address: null,
      label: 'Others',
    });
  }

  const points = buckets
    .map((bucket, index) => {
      const counts = bucketTotals[index].miners;
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      if (total <= 0) {
        return null;
      }

      const point = {
        label: bucket.label,
        startTime: bucket.startTime,
        endTime: bucket.endTime,
        totalBlocks: total,
      };

      for (const item of series) {
        point[item.id] = counts[item.id] || 0;
      }

      return point;
    })
    .filter(Boolean);

  return {
    chainId: chain,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'leaderboards'),
    period: periodBounds,
    groupBy,
    series,
    points,
  };
}

async function getMinerBlockDistribution(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const chain = normalizeChainId(chainId);
  const blockCount = Math.min(Math.max(toNumber(options.blocks) || 1000, 100), 5000);
  const topN = Math.min(Math.max(toNumber(options.top) || 9, 1), 14);
  const chainHealth = await resolveChainHealth(chain, options);

  if (chain !== 'vrm') {
    return {
      chainId: chain,
      enabled: false,
      trusted: false,
      source: getSource(chainHealth, 'leaderboards'),
      message: 'Miner distribution is only available for Verium (VRM).',
      segments: [],
    };
  }

  if (!chainHealth.checks.hasBlocks) {
    return Object.assign(disabledResponse(chain, chainHealth, 'leaderboards'), {
      segments: [],
    });
  }

  const tipRow = await db.get(
    `
		SELECT MAX(height) AS height
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
	`,
    [chain]
  );
  const tipHeight = toNullableNumber(tipRow?.height);

  if (tipHeight == null) {
    return {
      chainId: chain,
      trusted: chainHealth.trusted,
      source: getSource(chainHealth, 'leaderboards'),
      blockWindow: { count: blockCount, fromHeight: null, toHeight: null },
      totalBlocks: 0,
      segments: [],
    };
  }

  const minHeight = Math.max(MINERS_EXCLUDED_BLOCK_HEIGHT + 1, tipHeight - blockCount + 1);
  const rows = await db.all(
    `
		SELECT
			COALESCE(NULLIF(extracted_by_address, ''), NULLIF(extracted_by, '')) AS address,
			COUNT(*) AS block_count
		FROM blocks
		WHERE chain_id = ?
			AND status = 'main'
			AND height >= ?
			AND height <= ?
			AND height != ?
			AND COALESCE(NULLIF(extracted_by_address, ''), NULLIF(extracted_by, '')) IS NOT NULL
		GROUP BY address
		HAVING COUNT(*) > 0
		ORDER BY block_count DESC, address ASC
	`,
    [chain, minHeight, tipHeight, MINERS_EXCLUDED_BLOCK_HEIGHT]
  );

  const totalBlocks = rows.reduce((sum, row) => sum + toNumber(row.block_count), 0);
  const topRows = rows.slice(0, topN);
  const othersBlocks = rows.slice(topN).reduce((sum, row) => sum + toNumber(row.block_count), 0);

  const segments = topRows.map((row) => {
    const blocks = toNumber(row.block_count);
    return {
      id: row.address,
      address: row.address,
      label: formatMinerChartLabel(row.address),
      blocks,
      sharePct: totalBlocks > 0 ? (blocks / totalBlocks) * 100 : 0,
    };
  });

  if (othersBlocks > 0) {
    segments.push({
      id: MINERS_TREND_OTHERS_ID,
      address: null,
      label: 'Others',
      blocks: othersBlocks,
      sharePct: totalBlocks > 0 ? (othersBlocks / totalBlocks) * 100 : 0,
    });
  }

  return {
    chainId: chain,
    trusted: chainHealth.trusted,
    source: getSource(chainHealth, 'leaderboards'),
    blockWindow: {
      count: blockCount,
      fromHeight: minHeight,
      toHeight: tipHeight,
    },
    totalBlocks,
    segments,
  };
}

module.exports = {
  getChainSummary,
  getChainSummaryLite,
  getLatestBlocks,
  getBlocksPage,
  computeBlockTotalsRaw,
  getRichlist,
  getLeaderboard,
  getMinedLeaderboard,
  getMinerShareTrend,
  getMinerBlockDistribution,
  getAddress,
  getAddressBalanceHistory,
  getChainActivityHistory,
  getNetworkMetricHistory,
  getAddressUtxos,
  getTransaction,
  getTransactionRelatedAddresses,
  getBlock,
  enrichBlockInterestRates,
  resolveChainHealth,
  getIndexedSupplyAtHeight,
  getIndexedHashrate7dAvg,
};
