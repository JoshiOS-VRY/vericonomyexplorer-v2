"use strict";

function parseTruthy(value) {
	if (value === undefined || value === null) {
		return undefined;
	}

	return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function resolveIndexOnly(options = {}, indexerConfig = {}) {
	if (options.indexOnly === true) {
		return true;
	}

	if (options.indexOnly === false) {
		return false;
	}

	const env = parseTruthy(process.env.VCEXP_INDEX_ONLY);
	if (env !== undefined) {
		return env;
	}

	return indexerConfig.indexOnly === true;
}

function resolveRpcBatchSize(options = {}, indexOnly = false) {
	if (options.rpcBatchSize !== undefined) {
		const configured = Number(options.rpcBatchSize);
		if (Number.isFinite(configured) && configured > 0) {
			return Math.trunc(configured);
		}
	}

	if (!indexOnly) {
		return 1;
	}

	const env = Number(process.env.VCEXP_INDEX_ONLY_RPC_BATCH ?? 25);
	return Number.isFinite(env) && env > 0 ? Math.trunc(env) : 25;
}

function resolveStoreRawJson(options = {}, indexerConfig = {}, indexOnly = false) {
	if (indexOnly && options.storeRawJson === undefined) {
		return false;
	}

	if (options.storeRawJson === undefined) {
		return indexerConfig.storeRawJson !== false;
	}

	return options.storeRawJson !== false;
}

module.exports = {
	resolveIndexOnly,
	resolveRpcBatchSize,
	resolveStoreRawJson
};
