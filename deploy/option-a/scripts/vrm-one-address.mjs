#!/usr/bin/env node
const { createRequire } = require("node:module");
const require = createRequire(import.meta.url);
const { createRpcClient } = require("/app/app/indexerV2/rpcClient.js");

const ADDR = process.argv[2] || "VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176";
const client = createRpcClient({
	host: process.env.VCEXP_VRM_RPC_HOST || "172.19.0.1",
	port: Number(process.env.VCEXP_VRM_RPC_PORT || 33987),
	username: process.env.VCEXP_VRM_RPC_USER,
	password: process.env.VCEXP_VRM_RPC_PASS,
	timeout: 120000,
});

const unspent = await client.call("listunspent", [0, 9999999, [ADDR]]);
const utxoSumSats = unspent.reduce((t, r) => t + Math.round(Number(r.amount || 0) * 1e8), 0);

const out = { address: ADDR, listunspentCount: unspent.length, listunspentSumSats: utxoSumSats, listunspentSumCoins: utxoSumSats / 1e8 };

for (const method of ["getreceivedbyaddress", "getbalance"]) {
	try {
		out[method] = await client.call(method, method === "getbalance" ? [] : [ADDR, 0]);
	} catch (e) {
		out[method + "Error"] = e.message;
	}
}

try {
	out.getaddressinfo = await client.call("getaddressinfo", [ADDR]);
} catch (e) {
	out.getaddressinfoError = e.message;
}

try {
	out.listtransactions = (await client.call("listtransactions", ["*", 10, 0, true])).filter(
		(r) => r.address === ADDR,
	);
} catch (e) {
	out.listtransactionsError = e.message;
}

console.log(JSON.stringify(out, null, 2));
