"use strict";

const { createRpcClient } = require("/app/app/indexerV2/rpcClient.js");
const { getVoutAddresses } = require("/app/app/indexerV2/valueUtils.js");

const ADDR = process.argv[2] || "VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176";
const HEIGHT = Number(process.argv[3] || 1100546);

const client = createRpcClient({
	host: process.env.VCEXP_VRM_RPC_HOST || "172.19.0.1",
	port: Number(process.env.VCEXP_VRM_RPC_PORT || 33987),
	username: process.env.VCEXP_VRM_RPC_USER,
	password: process.env.VCEXP_VRM_RPC_PASS,
	timeout: 120000,
});

(async () => {
	const hash = await client.call("getblockhash", [HEIGHT]);
	const block = await client.call("getblock", [hash, 2]);
	const cb = block.tx[0];
	const rows = (cb.vout || []).map((vout) => ({
		n: vout.n,
		value: vout.value,
		extracted: getVoutAddresses(vout),
		type: vout.scriptPubKey?.type,
		address: vout.scriptPubKey?.address,
		addresses: vout.scriptPubKey?.addresses,
		hex: vout.scriptPubKey?.hex?.slice(0, 40),
	}));
	console.log(JSON.stringify({ height: HEIGHT, txid: cb.txid, vouts: rows, matches: rows.filter((r) => r.extracted.includes(ADDR) || JSON.stringify(r).includes("2bb01c408642bde2d118bb640f2e48e243544482")) }, null, 2));
})().catch((e) => {
	console.error(e.message);
	process.exit(1);
});
