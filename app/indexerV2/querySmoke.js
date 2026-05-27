"use strict";

const assert = require("assert");

const query = require("./query.js");
const dbModule = require("./db.js");

function run() {
	const db = dbModule.openDatabase();
	const chainId = process.env.VCEXP_INDEXER_SMOKE_CHAIN || "vrm";
	const summary = query.getChainSummary(chainId, { db });
	let utxoMs = null;

	assert.strictEqual(summary.chainId, chainId);
	assert.ok(summary.health.status);
	assert.ok(Array.isArray(summary.latestBlocks));
	assert.ok(Array.isArray(summary.recentTransactions));

	if (summary.health.trusted) {
		const richlist = query.getRichlist(chainId, { db, limit: 5 });
		assert.strictEqual(richlist.trusted, true);
		assert.ok(richlist.items.length > 0);

		const leaderboard = query.getLeaderboard(chainId, { db, period: "month", sort: "activity", limit: 5 });
		assert.strictEqual(leaderboard.trusted, true);
		assert.ok(Array.isArray(leaderboard.items));

		const address = query.getAddress(chainId, richlist.items[0].address, { db, limit: 5 });
		assert.strictEqual(address.found, true);
		assert.ok(address.transactions.length > 0);
		assert.ok(address.richlist);
		assert.strictEqual(address.richlist.eligible, true);
		assert.ok(address.richlist.rank >= 1);
		assert.ok(address.balance.firstSeenHeight === null || address.balance.firstSeenHeight >= 0);

		const balanceHistory = query.getAddressBalanceHistory(chainId, richlist.items[0].address, { db, maxPoints: 50 });
		assert.ok(Array.isArray(balanceHistory.buckets));
		assert.ok(Array.isArray(balanceHistory.points));
		assert.ok(Array.isArray(balanceHistory.categories));
		assert.ok(balanceHistory.currentBalanceAtomic);

		const since30d = Math.floor(Date.now() / 1000) - 30 * 86_400;
		const chainActivity = query.getChainActivityHistory(chainId, { db, since: since30d, maxPoints: 30 });
		assert.ok(Array.isArray(chainActivity.buckets));
		assert.ok(Array.isArray(chainActivity.categories));
		assert.ok(chainActivity.categories.length >= 3);
		if (chainActivity.buckets.length > 0) {
			const bucket = chainActivity.buckets[0];
			assert.ok(typeof bucket.minedCount === "number");
			assert.ok(typeof bucket.blockCount === "number");
		}

		const utxoStarted = performance.now();
		const utxos = query.getAddressUtxos(chainId, richlist.items[0].address, { db, limit: 5 });
		utxoMs = Math.round(performance.now() - utxoStarted);
		assert.ok(utxos.summary);
		assert.ok(Array.isArray(utxos.items));

		const tx = query.getTransaction(chainId, address.transactions[0].txid, { db });
		assert.strictEqual(tx.found, true);
		assert.ok(Array.isArray(tx.inputs));
		assert.ok(Array.isArray(tx.outputs));
		assert.ok(tx.totals);
		assert.ok(typeof tx.totals.inputAtomic === "string");
		assert.ok(typeof tx.totals.outputAtomic === "string");
		assert.ok(typeof tx.totals.feeAtomic === "string");
		assert.ok(tx.totals.input);
		assert.ok(tx.totals.output);
		assert.ok(tx.totals.fee);
		assert.ok(tx.siblings);
		assert.ok(Array.isArray(tx.changeOutputs));
		if (tx.confirmations != null) {
			assert.ok(tx.confirmations >= 1);
		}

		const block = query.getBlock(chainId, tx.transaction.blockHeight, { db, limit: 5 });
		assert.strictEqual(block.found, true);
		assert.ok(Array.isArray(block.transactions));
		assert.ok(block.block);
		assert.ok(typeof block.block.outputCount === "number" || block.block.outputCount === null);
		if (block.confirmations != null) {
			assert.ok(block.confirmations >= 1);
		}
		if (block.totals) {
			assert.ok(block.totals.fee);
			assert.ok(block.totals.outputValue);
		}
		if (block.coinbase) {
			assert.ok(block.coinbase.txid);
			assert.ok(block.coinbase.reward);
		}
		if (block.transactions.length > 0) {
			assert.ok(block.transactions[0].summary);
			assert.ok(typeof block.transactions[0].summary.outputCount === "number");
		}
	}

	dbModule.closeDatabase();

	console.log(JSON.stringify({
		ok: true,
		chainId,
		status: summary.health.status,
		trusted: summary.health.trusted,
		height: summary.health.heights.maxIndexedHeight,
		utxoQueryMs: utxoMs
	}, null, 2));
}

run();
