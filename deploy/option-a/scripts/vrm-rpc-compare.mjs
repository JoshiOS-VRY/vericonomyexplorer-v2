#!/usr/bin/env node
"use strict";

const { createRpcClient } = require("/app/app/indexerV2/rpcClient.js");

const host = process.env.VCEXP_VRM_RPC_HOST || "172.19.0.1";
const port = Number(process.env.VCEXP_VRM_RPC_PORT || 33987);
const client = createRpcClient({
	host,
	port,
	username: process.env.VCEXP_VRM_RPC_USER,
	password: process.env.VCEXP_VRM_RPC_PASS,
	timeout: 60000,
});

const addresses = process.argv.slice(2);
if (addresses.length === 0) {
	console.error("usage: vrm-rpc-compare.mjs <addr>...");
	process.exit(1);
}

for (const address of addresses) {
	const unspent = await client.call("listunspent", [0, 9999999, [address]]);
	const utxoSumSats = unspent.reduce((total, row) => {
		const coins = Number(row.amount || 0);
		return total + Math.round(coins * 1e8);
	}, 0);

	let received = null;
	try {
		received = await client.call("getreceivedbyaddress", [address, 0]);
	} catch (error) {
		received = { error: error.message };
	}

	console.log(
		JSON.stringify({
			address,
			listunspentCount: unspent.length,
			listunspentSumSats: utxoSumSats,
			listunspentSumCoins: utxoSumSats / 1e8,
			getreceivedbyaddress: received,
		}),
	);
}
