"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const dotenv = require("dotenv");

let loaded = false;

/** Load explorer .env files for standalone indexer CLI processes. */
function loadIndexerEnv() {
	if (loaded) {
		return;
	}
	loaded = true;

	const configPaths = [
		path.join(os.homedir(), ".config", "btc-rpc-explorer.env"),
		path.join("/etc", "btc-rpc-explorer", ".env"),
		path.join(process.cwd(), ".env"),
	];

	for (const configPath of configPaths) {
		if (fs.existsSync(configPath)) {
			dotenv.config({ path: configPath });
		}
	}
}

loadIndexerEnv();

const { loadAllMiningPoolConfigs } = require("./miningPoolConfigs.js");
loadAllMiningPoolConfigs();

module.exports = { loadIndexerEnv };
