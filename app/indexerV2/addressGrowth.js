'use strict';

const { hourBucketStart } = require('./periodStats.js');

/**
 * Cumulative indexed address count at a point in time (matches live snapshot semantics:
 * rows in address_balances that have appeared on-chain by that time).
 */
async function loadAddressFirstSeenTimes(db, chainId) {
  const rows = await db.all(
    `
		SELECT
			ab.address,
			COALESCE(
				ab.first_seen_time,
				(
					SELECT MIN(at.first_seen_time)
					FROM address_transactions at
					WHERE at.chain_id = ab.chain_id AND at.address = ab.address
				)
			) AS first_seen_time
		FROM address_balances ab
		WHERE ab.chain_id = ?
	`,
    [chainId]
  );

  const times = [];
  for (const row of rows) {
    const time = Number(row.first_seen_time);
    if (Number.isFinite(time) && time > 0) {
      times.push(time);
    }
  }

  times.sort((a, b) => a - b);
  return times;
}

function countAddressesFirstSeenBefore(sortedTimes, endTimeExclusive) {
  if (!sortedTimes.length || endTimeExclusive <= sortedTimes[0]) {
    return 0;
  }

  let lo = 0;
  let hi = sortedTimes.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sortedTimes[mid] < endTimeExclusive) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

async function resolveAddressGrowthRange(db, chainId, options = {}) {
  const since = options.since ?? null;
  const blockBounds = await db.get(
    `
		SELECT MIN(time) AS min_time, MAX(time) AS max_time
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
	`,
    [chainId]
  );

  const minBlockTime = blockBounds?.min_time != null ? Number(blockBounds.min_time) : null;
  const maxBlockTime = blockBounds?.max_time != null ? Number(blockBounds.max_time) : null;
  const now = Math.floor(Date.now() / 1000);

  let rangeStart = since ?? minBlockTime ?? now;
  if (minBlockTime != null) {
    rangeStart = Math.min(rangeStart, minBlockTime);
  }

  let rangeEnd = options.until ?? maxBlockTime ?? now;
  if (maxBlockTime != null) {
    rangeEnd = Math.max(rangeEnd, maxBlockTime);
  }

  return {
    rangeStart: hourBucketStart(rangeStart),
    rangeEnd: hourBucketStart(rangeEnd),
  };
}

function addressCountAtBucketEnd(sortedTimes, bucketStart) {
  return countAddressesFirstSeenBefore(sortedTimes, bucketStart + 3600);
}

module.exports = {
  loadAddressFirstSeenTimes,
  countAddressesFirstSeenBefore,
  resolveAddressGrowthRange,
  addressCountAtBucketEnd,
};
