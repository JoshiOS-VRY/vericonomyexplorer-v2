"use strict";

const utils = require("../utils.js");
const {
	chainIdToTicker,
	ensureMiningPoolConfigs,
	mapMinerFields,
} = require("./miningPoolConfigs.js");
function getBackfillBatchSize() {
	const configured = Number(process.env.VCEXP_BACKFILL_MINERS_BATCH_SIZE ?? 500);
	return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : 500;
}

function parseCoinbaseTxFromBlockRaw(rawJson) {
	if (!rawJson) {
		return null;
	}

	try {
		const block = JSON.parse(rawJson);
		const txs = Array.isArray(block.tx) ? block.tx : [];
		return txs.length > 0 && typeof txs[0] === "object" ? txs[0] : null;
	} catch {
		return null;
	}
}

function buildCoinbaseTxFromVouts(vouts, block) {
	return {
		blockhash: block.hash,
		vin: [{ coinbase: "00" }],
		vout: vouts.map((row) => ({
			n: row.n,
			value: Number(row.value_sats) / 100000000,
			scriptPubKey: row.address ? { address: row.address } : {},
		})),
	};
}

function resolveCoinbaseTx(db, chainId, block) {
	const fromBlock = parseCoinbaseTxFromBlockRaw(block.raw_json);
	if (fromBlock) {
		return fromBlock;
	}

	const txRow = db.prepare(`
		SELECT raw_json
		FROM transactions
		WHERE chain_id = ? AND block_height = ? AND is_coinbase = 1
		LIMIT 1
	`).get(chainId, block.height);

	if (txRow && txRow.raw_json) {
		try {
			return JSON.parse(txRow.raw_json);
		} catch {
			/* fall through */
		}
	}

	const vouts = db.prepare(`
		SELECT v.n, v.address, v.value_sats
		FROM vouts v
		INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
		WHERE v.chain_id = ? AND t.block_height = ? AND t.is_coinbase = 1
		ORDER BY v.n ASC
	`).all(chainId, block.height);

	if (vouts.length === 0) {
		return null;
	}

	return buildCoinbaseTxFromVouts(vouts, block);
}

function resolveProducerTx(db, chainId, block) {
	const chain = String(chainId || "").toLowerCase();

	if (chain === "vrc") {
		const producerFilter = `
			chain_id = ? AND block_height = ?
			AND (
				is_coinstake = 1
				OR (
					is_coinbase = 0
					AND tx_index = (
						SELECT MIN(t2.tx_index)
						FROM transactions t2
						WHERE t2.chain_id = transactions.chain_id
							AND t2.block_height = transactions.block_height
							AND t2.is_coinbase = 0
					)
				)
			)
		`;
		const txRow = db.prepare(`
			SELECT raw_json
			FROM transactions
			WHERE ${producerFilter}
			ORDER BY is_coinstake DESC, tx_index ASC
			LIMIT 1
		`).get(chain, block.height);

		if (txRow && txRow.raw_json) {
			try {
				return JSON.parse(txRow.raw_json);
			} catch {
				/* fall through */
			}
		}

		const vouts = db.prepare(`
			SELECT v.n, v.address, v.value_sats
			FROM vouts v
			INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
			WHERE t.chain_id = ? AND t.block_height = ?
				AND (
					t.is_coinstake = 1
					OR (
						t.is_coinbase = 0
						AND t.tx_index = (
							SELECT MIN(t2.tx_index)
							FROM transactions t2
							WHERE t2.chain_id = t.chain_id
								AND t2.block_height = t.block_height
								AND t2.is_coinbase = 0
						)
					)
				)
			ORDER BY t.is_coinstake DESC, t.tx_index ASC, v.n ASC
		`).all(chain, block.height);

		if (vouts.length === 0) {
			return null;
		}

		return {
			blockhash: block.hash,
			vin: [{ txid: "00", vout: 0 }],
			vout: vouts.map((row) => ({
				n: row.n,
				value: Number(row.value_sats) / 100000000,
				scriptPubKey: row.address ? { address: row.address } : {},
			})),
		};
	}

	return resolveCoinbaseTx(db, chainId, block);
}

function backfillChain(db, chainId, options = {}) {
	const chain = String(chainId || "").toLowerCase();

	if (chain !== "vrm" && chain !== "vrc") {
		return {
			chainId: chain,
			skipped: true,
			reason: "miner backfill only applies to VRM and VRC",
		};
	}

	const ticker = chainIdToTicker(chain);
	ensureMiningPoolConfigs(ticker);

	const batchSize = options.batchSize || getBackfillBatchSize();
	const updateStmt = db.prepare(`
		UPDATE blocks
		SET extracted_by = ?, extracted_by_address = ?
		WHERE chain_id = ? AND height = ?
	`);

	const countRow = db.prepare(`
		SELECT COUNT(*) AS count
		FROM blocks
		WHERE chain_id = ?
	`).get(chain);

	let processed = 0;
	let updated = 0;
	let lastHeight = -1;

	const selectBlocks = db.prepare(`
		SELECT height, hash, raw_json, extracted_by, extracted_by_address
		FROM blocks
		WHERE chain_id = ?
			AND height > ?
		ORDER BY height ASC
		LIMIT ?
	`);

	while (true) {
		const rows = selectBlocks.all(chain, lastHeight, batchSize);
		if (rows.length === 0) {
			break;
		}

		const runBatch = db.transaction((batchRows) => {
			for (const block of batchRows) {
				const producerTx = resolveProducerTx(db, chain, block);
				if (!producerTx) {
					continue;
				}

				const miner = chain === "vrc"
					? utils.identifyStaker(producerTx, block.height, ticker)
					: utils.identifyMiner(producerTx, block.height, ticker);
				const mapped = mapMinerFields(miner);

				if (
					mapped.extractedBy === (block.extracted_by || null)
					&& mapped.extractedByAddress === (block.extracted_by_address || null)
				) {
					continue;
				}

				updateStmt.run(
					mapped.extractedBy,
					mapped.extractedByAddress,
					chain,
					block.height,
				);
				updated += 1;
			}
		});

		runBatch(rows);
		processed += rows.length;
		lastHeight = rows[rows.length - 1].height;

		process.stderr.write(
			`[backfill-miners] ${chain}: processed ${processed}/${countRow.count}, updated ${updated}\n`,
		);
	}

	return {
		chainId: chain,
		processed,
		updated,
		total: countRow.count,
	};
}

module.exports = {
	backfillChain,
};
