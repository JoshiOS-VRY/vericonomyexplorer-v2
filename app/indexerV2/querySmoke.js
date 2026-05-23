"use strict";

const assert = require("assert");

const query = require("./query.js");
const dbModule = require("./db.js");

function run() {
	const db = dbModule.openDatabase();
	const chainId = process.env.VCEXP_INDEXER_SMOKE_CHAIN || "vrm";
	const summary = query.getChainSummary(chainId, { db });

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

		const tx = query.getTransaction(chainId, address.transactions[0].txid, { db });
		assert.strictEqual(tx.found, true);
		assert.ok(Array.isArray(tx.inputs));
		assert.ok(Array.isArray(tx.outputs));

		const block = query.getBlock(chainId, tx.transaction.blockHeight, { db, limit: 5 });
		assert.strictEqual(block.found, true);
		assert.ok(Array.isArray(block.transactions));
	}

	dbModule.closeDatabase();

	console.log(JSON.stringify({
		ok: true,
		chainId,
		status: summary.health.status,
		trusted: summary.health.trusted,
		height: summary.health.heights.maxIndexedHeight
	}, null, 2));
}

run();
