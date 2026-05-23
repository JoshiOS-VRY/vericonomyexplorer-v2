"use strict";

const config = require("./../config.js");
const coins = require("../coins.js");
const utils = require("../utils.js");

const electrumAddressApi = require("./electrumAddressApi.js");
const blockchainAddressApi = require("./blockchainAddressApi.js");
const blockchairAddressApi = require("./blockchairAddressApi.js");
const blockcypherAddressApi = require("./blockcypherAddressApi.js");

// Conditionally require sqliteAddressApi if SQLite is enabled
let sqliteAddressApi = null;
if (config.sqliteEnabled) {
	try {
		sqliteAddressApi = require("./sqliteAddressApi.js");
	} catch (err) {
		// SQLite address API not available, will fall back to other APIs
		utils.logError("addressApi-sqlite-import", err);
	}
}

function getSupportedAddressApis() {
	return ["blockchain.com", "blockchair.com", "blockcypher.com", "electrum", "electrumx"];
}

function getCurrentAddressApiFeatureSupport() {
	// If SQLite is enabled, prefer it for address lookups
	if (config.sqliteEnabled && sqliteAddressApi) {
		return sqliteAddressApi.getCurrentAddressApiFeatureSupport();
	}

	if (config.addressApi == "blockchain.com") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: true
		};

	} else if (config.addressApi == "blockchair.com") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: false
		};

	} else if (config.addressApi == "blockcypher.com") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: false
		};

	} else if (config.addressApi == "electrum" || config.addressApi == "electrumx") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: true
		};
	}
}

function getAddressDetails(address, scriptPubkey, sort, limit, offset) {
	return new Promise(function(resolve, reject) {
		var promises = [];

		// If SQLite is enabled, try it first
		if (config.sqliteEnabled && sqliteAddressApi) {
			promises.push(sqliteAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));
		}

		// Fallback to configured address API
		if (config.addressApi == "blockchain.com") {
			promises.push(blockchainAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else if (config.addressApi == "blockchair.com") {
			promises.push(blockchairAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else if (config.addressApi == "blockcypher.com") {
			promises.push(blockcypherAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else if (config.addressApi == "electrum" || config.addressApi == "electrumx") {
			promises.push(electrumAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else if (!config.sqliteEnabled) {
			// Only add error if SQLite is not enabled
			promises.push(new Promise(function(resolve, reject) {
				resolve({addressDetails:null, errors:["No address API configured"]});
			}));
		}

		Promise.all(promises).then(function(results) {
			// Prefer SQLite result if available and valid
			for (let i = 0; i < results.length; i++) {
				if (results[i] && results[i].addressDetails) {
					resolve(results[i]);
					return;
				}
			}

			// If no valid result, return first result (may have errors)
			if (results && results.length > 0) {
				resolve(results[0]);
			} else {
				resolve(null);
			}
		}).catch(function(err) {
			reject(err);
		});
	});
}



module.exports = {
	getSupportedAddressApis: getSupportedAddressApis,
	getCurrentAddressApiFeatureSupport: getCurrentAddressApiFeatureSupport,
	getAddressDetails: getAddressDetails
};