"use strict";

const { createRpcClient } = require("/app/app/indexerV2/rpcClient.js");

const ADDR = process.argv[2];
const client = createRpcClient({
	host: process.env.VCEXP_VRM_RPC_HOST || "172.19.0.1",
	port: Number(process.env.VCEXP_VRM_RPC_PORT || 33987),
	username: process.env.VCEXP_VRM_RPC_USER,
	password: process.env.VCEXP_VRM_RPC_PASS,
	timeout: 300000,
});

(async () => {
	await client.call("scantxoutset", ["start", [`addr(${ADDR})`]]);
	const scan = await client.call("scantxoutset", ["scan"]);
	const totalSats = Math.round(Number(scan.total_amount || 0) * 1e8);
	process.stdout.write(
		`${JSON.stringify({ total_amount: scan.total_amount, total_sats: totalSats, txouts: scan.txouts, height: scan.height })}\n`,
	);
})().catch((e) => {
	process.stderr.write(`${e.message}\n`);
	process.exit(1);
});
