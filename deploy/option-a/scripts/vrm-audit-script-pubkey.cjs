"use strict";

/**
 * Find VRM vouts that pay an address via script hex but lack scriptPubKey.address
 * (getVoutAddresses would miss them). Samples coinbase blocks in a height range.
 *
 * Usage (inside vrm-indexer image):
 *   node deploy/option-a/scripts/vrm-audit-script-pubkey.cjs <address> <fromHeight> <toHeight>
 */

const { createRpcClient } = require("/app/app/indexerV2/rpcClient.js");
const { getVoutAddresses, decimalToAtomicUnits } = require("/app/app/indexerV2/valueUtils.js");

const ADDR = process.argv[2];
const FROM = Number(process.argv[3] || 894865);
const TO = Number(process.argv[4] || 895500);

if (!ADDR) {
	console.error("Usage: vrm-audit-script-pubkey.cjs <address> [fromHeight] [toHeight]");
	process.exit(1);
}

const client = createRpcClient({
	host: process.env.VCEXP_VRM_RPC_HOST || "172.19.0.1",
	port: Number(process.env.VCEXP_VRM_RPC_PORT || 33987),
	username: process.env.VCEXP_VRM_RPC_USER,
	password: process.env.VCEXP_VRM_RPC_PASS,
	timeout: 120000,
});

(async () => {
	const info = await client.call("getaddressinfo", [ADDR]);
	const pubkeyHex = (info.pubkey || "").toLowerCase();
	const pubkeyHashHex = pubkeyHex ? pubkeyHex.slice(2) : null;

	let blocksScanned = 0;
	let hitsExtracted = 0;
	let hitsScriptOnly = 0;
	let scriptOnlySats = 0n;

	for (let height = FROM; height <= TO; height++) {
		const hash = await client.call("getblockhash", [height]);
		const block = await client.call("getblock", [hash, 2]);
		const txs = Array.isArray(block.tx) ? block.tx : [];
		blocksScanned++;

		for (const tx of txs) {
			if (!Array.isArray(tx.vout)) continue;
			for (const vout of tx.vout) {
				const spk = vout.scriptPubKey || {};
				const extracted = getVoutAddresses(vout);
				const inExtracted = extracted.includes(ADDR);
				const scriptBlob = JSON.stringify(spk).toLowerCase();
				const mentionsPk = pubkeyHashHex && scriptBlob.includes(pubkeyHashHex);
				const mentionsAddr = scriptBlob.includes(ADDR.toLowerCase());
				if (!inExtracted && !mentionsPk && !mentionsAddr) continue;

				const valueSats = decimalToAtomicUnits(vout.value || 0);
				if (inExtracted) {
					hitsExtracted++;
					continue;
				}

				hitsScriptOnly++;
				scriptOnlySats += valueSats;
				if (hitsScriptOnly <= 25) {
					process.stdout.write(
						`${JSON.stringify({
							height,
							txid: tx.txid,
							n: vout.n,
							value: vout.value,
							type: spk.type,
							extractedAddresses: extracted,
							hasAddressField: !!spk.address,
						})}\n`,
					);
				}
			}
		}
	}

	process.stdout.write(
		`${JSON.stringify({
			address: ADDR,
			from: FROM,
			to: TO,
			blocksScanned,
			hitsExtracted,
			hitsScriptOnly,
			scriptOnlyCoins: Number(scriptOnlySats) / 1e8,
		})}\n`,
	);
})().catch((error) => {
	process.stderr.write(`${error.message}\n`);
	process.exit(1);
});
