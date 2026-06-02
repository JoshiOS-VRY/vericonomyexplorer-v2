"use strict";

function resolveYieldMs(options = {}) {
	if (options.yieldMs !== undefined) {
		const configured = Number(options.yieldMs);
		if (Number.isFinite(configured) && configured >= 0) {
			return Math.trunc(configured);
		}
	}

	const env = Number(process.env.VCEXP_INDEXER_YIELD_MS ?? process.env.VCEXP_BACKFILL_YIELD_MS ?? 0);
	if (Number.isFinite(env) && env >= 0) {
		return Math.trunc(env);
	}

	return 0;
}

function resolveBlocksPerPass(options = {}) {
	if (options.maxBlocksPerPass !== undefined) {
		const configured = Number(options.maxBlocksPerPass);
		if (Number.isFinite(configured) && configured > 0) {
			return Math.trunc(configured);
		}
	}

	const env = Number(process.env.VCEXP_INDEXER_BLOCKS_PER_PASS ?? 0);
	if (Number.isFinite(env) && env > 0) {
		return Math.trunc(env);
	}

	return 0;
}

function sleepMs(ms) {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		/* intentional busy-wait for short cooperative yields in sync backfills */
	}
}

function yieldBetweenWrites(options = {}) {
	const ms = resolveYieldMs(options);
	if (ms > 0) {
		sleepMs(ms);
	}
}

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function yieldToReaders(options = {}) {
	const ms = resolveYieldMs(options);
	if (ms > 0) {
		await sleep(ms);
	}
}

module.exports = {
	resolveYieldMs,
	resolveBlocksPerPass,
	yieldBetweenWrites,
	yieldToReaders,
	sleep,
	sleepMs
};
