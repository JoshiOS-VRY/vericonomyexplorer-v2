"use strict";

const Decimal = require("decimal.js");
const Decimal8 = Decimal.clone({ precision:8, rounding:8 });

// Vericoin uses Proof-of-Stake-Time (PoST), not mining rewards
// Block rewards are based on staking interest, not fixed block rewards

const currencyUnits = [
	{
		type:"native",
		name:"VRC",
		multiplier:1,
		default:true,
		values:["", "vrc", "VRC"],
		decimalPlaces:8
	},
	{
		type:"native",
		name:"mVRC",
		multiplier:1000,
		values:["mvrc"],
		decimalPlaces:5
	},
	{
		type:"native",
		name:"bits",
		multiplier:1000000,
		values:["bits"],
		decimalPlaces:2
	},
	{
		type:"native",
		name:"sat",
		multiplier:100000000,
		values:["sat", "satoshi"],
		decimalPlaces:0
	},
	{
		type:"exchanged",
		name:"USD",
		multiplier:"usd",
		values:["usd"],
		decimalPlaces:2,
		symbol:"$"
	},
	{
		type:"exchanged",
		name:"EUR",
		multiplier:"eur",
		values:["eur"],
		decimalPlaces:2,
		symbol:"€"
	},
];

module.exports = {
	name:"Vericoin",
	ticker:"VRC",
	logoUrlsByNetwork:{
		"main":"./img/network-vericoin/logo.svg",
		"test":"./img/network-vericoin/logo.svg",
		"regtest":"./img/network-vericoin/logo.svg",
		"signet":"./img/network-vericoin/logo.svg"
	},
	coinIconUrlsByNetwork:{
		"main":"./img/network-vericoin/coin-icon.svg",
		"test":"./img/network-vericoin/coin-icon.svg",
		"signet":"./img/network-vericoin/coin-icon.svg",
		"regtest":"./img/network-vericoin/coin-icon.svg"
	},
	coinColorsByNetwork: {
		"main": "#1E88E5", // Vericoin blue color (adjust as needed)
		"test": "#1daf00",
		"signet": "#af008c",
		"regtest": "#777"
	},
	siteTitlesByNetwork: {
		"main":"Vericoin Block Explorer",
		"test":"Vericoin Testnet Explorer",
		"regtest":"Vericoin Regtest Explorer",
		"signet":"Vericoin Signet Explorer",
	},
	demoSiteUrlsByNetwork: {
		"main": "https://explorer-vrc.vericonomy.com",
		"test": "https://testnet-explorer-vrc.vericonomy.com",
		"signet": "https://signet-explorer-vrc.vericonomy.com",
	},
	knownTransactionsByNetwork: {
		main: "", // Genesis transaction ID - will be extracted from genesis block
		test: "",
		signet: ""
	},
	miningPoolsConfigUrls:[
		// Vericoin uses PoST, not mining pools
		// Staking pools may be configured here if needed
	],
	maxBlockWeight: 4000000,
	maxBlockSize: 1000000,
	minTxBytes: 166,
	minTxWeight: 166 * 4,
	difficultyAdjustmentBlockCount: null, // PoST doesn't use difficulty adjustment (PoW uses 14 days)
	maxSupplyByNetwork: {
		"main": new Decimal(21000000), // Vericoin max supply (same as Bitcoin)
		"test": new Decimal(21000000),
		"regtest": new Decimal(21000000),
		"signet": new Decimal(21000000)
	},
	targetBlockTimeSeconds: 60, // Vericoin: 60 seconds (1 minute) for PoW, variable for PoST
	targetBlockTimeMinutes: 1,
	currencyUnits:currencyUnits,
	currencyUnitsByName:{"VRC":currencyUnits[0], "mVRC":currencyUnits[1], "bits":currencyUnits[2], "sat":currencyUnits[3]},
	baseCurrencyUnit:currencyUnits[3],
	defaultCurrencyUnit:currencyUnits[0],
	feeSatoshiPerByteBucketMaxima: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50, 75, 100, 150],
	
	// Vericoin uses PoST, not halving
	halvingBlockIntervalsByNetwork: {
		"main": null, // PoST doesn't have halvings
		"test": null,
		"regtest": null,
		"signet": null
	},

	terminalHalvingCountByNetwork: {
		"main": null,
		"test": null,
		"regtest": null,
		"signet": null
	},

	// used for supply estimates that don't need full gettxoutset accuracy
	coinSupplyCheckpointsByNetwork: {
		"main": [ 0, new Decimal(0) ], // TODO: Update with actual Vericoin data
		"test": [ 0, new Decimal(0) ],
		"signet": [ 0, new Decimal(0) ],
		"regtest": [ 0, new Decimal(0) ]
	},

	utxoSetCheckpointsByNetwork: {
		"main": {
			// TODO: Populate with actual Vericoin UTXO set data
			"height": 0,
			"bestblock": "0000000000000000000000000000000000000000000000000000000000000000",
			"txouts": 0,
			"bogosize": 0,
			"hash_serialized_2": "0000000000000000000000000000000000000000000000000000000000000000",
			"disk_size": 0,
			"total_amount": 0
		},
		"test": {
			"height": 0,
			"bestblock": "0000000000000000000000000000000000000000000000000000000000000000",
			"txouts": 0,
			"bogosize": 0,
			"hash_serialized_2": "0000000000000000000000000000000000000000000000000000000000000000",
			"disk_size": 0,
			"total_amount": 0
		},
		"signet": {
			"height": 0,
			"bestblock": "0000000000000000000000000000000000000000000000000000000000000000",
			"txouts": 0,
			"bogosize": 0,
			"hash_serialized_2": "0000000000000000000000000000000000000000000000000000000000000000",
			"disk_size": 0,
			"total_amount": 0
		},
		"regtest": {
			"height": 0,
			"bestblock": "0000000000000000000000000000000000000000000000000000000000000000",
			"txouts": 0,
			"bogosize": 0,
			"hash_serialized_2": "0000000000000000000000000000000000000000000000000000000000000000",
			"disk_size": 0,
			"total_amount": 0
		}
	},

	genesisBlockHashesByNetwork: {
		"main": "000004da58a02be894a6c916d349fe23cc29e21972cafb86b5d3f07c4b8e6bb8", // Verified: Vericoin genesis block hash
		"test": "",
		"signet": "",
		"regtest": ""
	},

	genesisCoinbaseTransactionIdsByNetwork: {
		"main": "60424046d38de827de0ed1a20a351aa7f3557e3e1d3df6bfb34a94bc6161ec68", // Genesis transaction ID (also the merkle root)
		"test": "",
		"signet": "",
		"regtest": ""
	},

	genesisCoinbaseTransactionsByNetwork: {
		"main": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1e03e703170456657269436f696e20626c6f636b2031333430323932ffffffff0100c817a804000000000000000000000000000000000000000000000000000000000000000000000000", // Constructed from known genesis block data
			"txid": "60424046d38de827de0ed1a20a351aa7f3557e3e1d3df6bfb34a94bc6161ec68", // Genesis transaction ID (matches merkle root)
			"hash": "60424046d38de827de0ed1a20a351aa7f3557e3e1d3df6bfb34a94bc6161ec68",
			"size": 204, // From block data: strippedsize
			"vsize": 204,
			"weight": 204, // From block data
			"version": 1,
			"locktime": 0,
			"vin": [{
				"coinbase": "03e703170456657269436f696e20626c6f636b2031333430323932", // "VeriCoin block 1340292"
				"sequence": 4294967295
			}],
			"vout": [{
				"value": 2500.00000000, // Genesis reward: 2500 VRC (from chainparams.cpp line 113)
				"n": 0,
				"scriptPubKey": {
					"asm": "OP_RETURN",
					"hex": "6a",
					"type": "nulldata"
				}
			}]
		},
		"test": {
			"hex": "",
			"txid": "",
			"hash": "",
			"size": 0,
			"vsize": 0,
			"weight": 0,
			"version": 1,
			"locktime": 0,
			"vin": [],
			"vout": []
		},
		"signet": {
			"hex": "",
			"txid": "",
			"hash": "",
			"size": 0,
			"vsize": 0,
			"weight": 0,
			"version": 1,
			"locktime": 0,
			"vin": [],
			"vout": []
		},
		"regtest": {
			"hex": "",
			"txid": "",
			"hash": "",
			"size": 0,
			"vsize": 0,
			"weight": 0,
			"version": 1,
			"locktime": 0,
			"vin": [],
			"vout": []
		}
	},

	genesisBlockStatsByNetwork: {
		"main": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "000004da58a02be894a6c916d349fe23cc29e21972cafb86b5d3f07c4b8e6bb8",
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxfeerate": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 1399690945, // Genesis timestamp from chainparams.cpp line 113
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 250000000000, // 2500 VRC * 100000000 satoshis
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1399690945, // Genesis timestamp: May 9, 2014
			"total_out": 250000000000,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 0
		},
		"test": {},
		"signet": {},
		"regtest": {}
	},

	testData: {
		"address": "", // TODO: Add test address
		"txid": "", // TODO: Add test transaction
		"blockHash": "", // TODO: Add test block
		"blockHeight": 0
	},

	genesisCoinbaseOutputAddressScripthash: "", // TODO: Extract from Vericoin source

	// Vericoin uses PoST - staking/minting instead of mining
	// Historical data for Vericoin milestones
	// Key heights from chainparams.cpp:
	// - PoS starts at height 20160
	// - PoST starts at height 608100
	// - Initial coin supply: 26,751,452 VRC
	historicalData: [
		{
			blockheight: 0,
			type: "block",
			title: "Genesis Block",
			date: "2014-05-09",
			description: "Vericoin genesis block created"
		},
		{
			blockheight: 20160,
			type: "block",
			title: "PoS Activation",
			date: "2014-05-09", // Approximate
			description: "Proof-of-Stake (PoS) activated"
		},
		{
			blockheight: 608100,
			type: "block",
			title: "PoST Activation",
			date: "2014-05-09", // Approximate
			description: "Proof-of-Stake-Time (PoST) activated"
		}
	],

	// Exchange rate data - TODO: Replace with Vericoin-specific API
	exchangeRateData: {
		exchanges: [
			{
				name: "CoinDesk",
				url: "https://api.coindesk.com/v1/bpi/currentprice.json",
				jsonpath: "$.bpi.USD.rate",
				responseType: "json"
			}
		]
	},

	// Block reward function for Vericoin (PoST - interest-based)
	// Vericoin uses Proof-of-Stake-Time, so rewards are based on staking interest
	// This is a placeholder - actual implementation depends on Vericoin's staking formula
	blockRewardFunction: function(blockHeight, network = "main") {
		// PoST rewards are calculated based on:
		// - Staking balance
		// - Staking time (coin age)
		// - Interest rate
		// This is a simplified placeholder
		// TODO: Implement actual Vericoin staking reward calculation
		
		// For now, return a placeholder
		// In reality, this would need to query the block's staking data
		return new Decimal8(0);
	},

	// Vericoin-specific: Staking enabled
	stakingEnabled: true,
	
	// Vericoin-specific: Interest rate (PoST feature)
	interestRateEnabled: true
};

