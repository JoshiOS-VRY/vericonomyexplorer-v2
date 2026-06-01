"use strict";

const chains = {
	vrm: {
		id: "vrm",
		path: "vrm",
		aliases: ["verium"],
		ticker: "VRM",
		name: "Verium",
		consensus: "PoWT",
		logo: "./img/vericonomy/verium-logo.svg",
		searchPlaceholder: "Search VRM block, txid, or address",
		pageTitle: "Verium Explorer"
	},
	vrc: {
		id: "vrc",
		path: "vrc",
		aliases: ["vericoin"],
		ticker: "VRC",
		name: "VeriCoin",
		consensus: "PoST",
		logo: "./img/vericonomy/vericoin-logo.svg",
		searchPlaceholder: "Search VRC block, txid, or address",
		pageTitle: "VeriCoin Explorer"
	}
};

function normalizeChainId(chainId) {
	const value = String(chainId || "").trim().toLowerCase();

	for (const chain of Object.values(chains)) {
		if (chain.id === value || chain.aliases.includes(value)) {
			return chain.id;
		}
	}

	throw new Error(`Unknown chain: ${chainId}`);
}

function getChainMeta(chainId) {
	return chains[normalizeChainId(chainId)];
}

function getChainBasePath(chainId) {
	return `./${getChainMeta(chainId).path}`;
}

module.exports = {
	chains,
	normalizeChainId,
	getChainMeta,
	getChainBasePath
};
