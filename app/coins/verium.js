"use strict";

const Decimal = require("decimal.js");
const Decimal8 = Decimal.clone({ precision:8, rounding:8 });

const veriumFun = require("./veriumFun.js");

const blockRewardEras = [ new Decimal8(50) ];
for (let i = 1; i < 34; i++) {
	let previous = blockRewardEras[i - 1];
	blockRewardEras.push(new Decimal8(previous).dividedBy(2));
}

const currencyUnits = [
	{
		type:"native",
		name:"VRM",
		multiplier:1,
		default:true,
		values:["", "vrm", "VRM"],
		decimalPlaces:8
	},
	{
		type:"native",
		name:"mVRM",
		multiplier:1000,
		values:["mvrm"],
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
	name:"Verium",
	ticker:"VRM",
	logoUrlsByNetwork:{
		"main":"./img/network-verium/logo.svg",
		"test":"./img/network-verium/logo.svg",
		"regtest":"./img/network-verium/logo.svg",
		"signet":"./img/network-verium/logo.svg"
	},
	coinIconUrlsByNetwork:{
		"main":"./img/network-verium/coin-icon.svg",
		"test":"./img/network-verium/coin-icon.svg",
		"signet":"./img/network-verium/coin-icon.svg",
		"regtest":"./img/network-verium/coin-icon.svg"
	},
	coinColorsByNetwork: {
		"main": "#FF6B35", // Verium orange color
		"test": "#1daf00",
		"signet": "#af008c",
		"regtest": "#777"
	},
	siteTitlesByNetwork: {
		"main":"Verium Block Explorer",
		"test":"Verium Testnet Explorer",
		"regtest":"Verium Regtest Explorer",
		"signet":"Verium Signet Explorer",
	},
	demoSiteUrlsByNetwork: {
		"main": "https://veriumexplorer.org",
		"test": "https://testnet.veriumexplorer.org",
		"signet": "https://signet.veriumexplorer.org",
	},
	knownTransactionsByNetwork: {
		main: "925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9", // Verium genesis transaction
		test: "22e7e860660f368b5c653c272b0445a0625d19fdec02fc158ef9800a5c3a07e8",
		signet: "39332e10af6fe491e8ae4ba1e2dd674698fedf8aa3c8c42bf71572debc1bb5b9"
	},
	miningPoolsConfigUrls:[
		"https://raw.githubusercontent.com/verium/Verium-Known-Miners/master/miners.json",
		"https://raw.githubusercontent.com/verium-data/mining-pools/generated/pools.json"
	],
	maxBlockWeight: 4000000,
	maxBlockSize: 1000000,
	minTxBytes: 166,
	minTxWeight: 166 * 4,
	difficultyAdjustmentBlockCount: 2880, // 2 days at 5 minute intervals (Verium uses 2-day timespan)
	maxSupplyByNetwork: {
		"main": new Decimal(21000000), // Verium total supply
		"test": new Decimal(21000000),
		"regtest": new Decimal(21000000),
		"signet": new Decimal(21000000)
	},
	targetBlockTimeSeconds: 300, // 5 minutes (Verium uses variable block time)
	targetBlockTimeMinutes: 5,
	currencyUnits:currencyUnits,
	currencyUnitsByName:{"VRM":currencyUnits[0], "mVRM":currencyUnits[1], "bits":currencyUnits[2], "sat":currencyUnits[3]},
	baseCurrencyUnit:currencyUnits[3],
	defaultCurrencyUnit:currencyUnits[0],
	feeSatoshiPerByteBucketMaxima: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50, 75, 100, 150],
	
	halvingBlockIntervalsByNetwork: {
		"main": 210000,
		"test": 210000,
		"regtest": 150,
		"signet": 210000
	},

	terminalHalvingCountByNetwork: {
		"main": 32,
		"test": 32,
		"regtest": 32,
		"signet": 32
	},

	// used for supply estimates that don't need full gettxoutset accuracy
	coinSupplyCheckpointsByNetwork: {
		"main": [ 0, new Decimal(0) ], // Will need to be updated with actual Verium data
		"test": [ 0, new Decimal(0) ],
		"signet": [ 0, new Decimal(0) ],
		"regtest": [ 0, new Decimal(0) ]
	},

	utxoSetCheckpointsByNetwork: {
		"main": {
			// Will need to be populated with actual Verium UTXO set data
			"height": 0,
			"bestblock": "0000000000000000000000000000000000000000000000000000000000000000",
			"txouts": 0,
			"bogosize": 0,
			"muhash": "0000000000000000000000000000000000000000000000000000000000000000",
			"total_amount": "0",
			"total_unspendable_amount": "0",
			"transactions": 0,
			"disk_size": 0,
			"hash_serialized_2": "0000000000000000000000000000000000000000000000000000000000000000",
			"lastUpdated": Date.now()
		}
	},
	
	genesisBlockHashesByNetwork:{
		"main":	"8232c0cf3bd7e05546e3d7aaaaf89fed8bc97c4df1a8c95e9249e13a2734932b", // Real Verium genesis hash
		"test":	"0000000000000000000000000000000000000000000000000000000000000000",
		"regtest": "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206",
		"signet":  "00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6", 
	},
	genesisCoinbaseTransactionIdsByNetwork: {
		"main":	"925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9", // Real Verium genesis transaction
		"test":	"0000000000000000000000000000000000000000000000000000000000000000",
		"regtest": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
		"signet":  "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
	},
	genesisCoinbaseTransactionsByNetwork:{
		"main": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1e03e703170456657269436f696e20626c6f636b2031333430323932ffffffff0100c817a804000000000000000000000000000000000000000000000000000000000000000000000000",
			"txid": "925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9",
			"hash": "925e430072a1f39b530fc79db162e29433ab0ea266a99c8cab4f03001dc9faa9",
			"size": 95,
			"vsize": 95,
			"version": 1,
			"confirmations": 0,
			"vin": [
				{
					"coinbase": "03e703170456657269436f696e20626c6f636b2031333430323932",
					"sequence": 4294967295
				}
			],
			"vout": [
				{
					"value": 2500.00000000,
					"n": 0,
					"scriptPubKey": {
						"asm": "OP_RETURN",
						"hex": "6a",
						"type": "nulldata"
					}
				}
			],
			"blockhash": "8232c0cf3bd7e05546e3d7aaaaf89fed8bc97c4df1a8c95e9249e13a2734932b",
			"time": 1472669240,
			"blocktime": 1472669240
		},
		"test": {
			"hex": "0000000000000000000000000000000000000000000000000000000000000000",
			"txid": "0000000000000000000000000000000000000000000000000000000000000000",
			"hash": "0000000000000000000000000000000000000000000000000000000000000000",
			"version": 1,
			"size": 0,
			"vsize": 0,
			"weight": 0,
			"locktime": 0,
			"vin": [],
			"vout": [],
			"blockhash": "0000000000000000000000000000000000000000000000000000000000000000",
			"time": 0,
			"blocktime": 0
		},
		"regtest": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000",
			"txid": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			"hash": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			"version": 1,
			"size": 204,
			"vsize": 204,
			"weight": 816,
			"locktime": 0,
			"vin": [
				{
					"coinbase": "04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73",
					"sequence": 4294967295
				}
			],
			"vout": [
				{
					"value": 50.00000000,
					"n": 0,
					"scriptPubKey": {
						"asm": "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f OP_CHECKSIG",
						"hex": "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac",
						"type": "pubkey"
					}
				}
			],
			"blockhash": "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206",
			"time": 1296688602,
			"blocktime": 1296688602
		},
		"signet": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000",
			"txid": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			"hash": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			"version": 1,
			"size": 204,
			"vsize": 204,
			"weight": 816,
			"locktime": 0,
			"vin": [
				{
					"coinbase": "04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73",
					"sequence": 4294967295
				}
			],
			"vout": [
				{
					"value": 50.00000000,
					"n": 0,
					"scriptPubKey": {
						"asm": "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f OP_CHECKSIG",
						"hex": "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac",
						"type": "pubkey"
					}
				}
			],
			"blockhash": "00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6",
			"time": 1598918400,
			"blocktime": 1598918400
		}
	},
	genesisBlockStatsByNetwork:{
		"main": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "0000000000000000000000000000000000000000000000000000000000000000",
			"feerate_percentiles": [0, 0, 0, 0, 0],
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxfeerate": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 0,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 5000000000,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 0,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 117
		},
		"test": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "0000000000000000000000000000000000000000000000000000000000000000",
			"feerate_percentiles": [0, 0, 0, 0, 0],
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 0,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 5000000000,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 0,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 117
		},
		"regtest": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206",
			"feerate_percentiles": [0, 0, 0, 0, 0],
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxfeerate": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 1296688602,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 5000000000,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1296688602,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 117
		},
		"signet": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6",
			"feerate_percentiles": [0, 0, 0, 0, 0],
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxfeerate": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 1598918400,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 5000000000,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1598918400,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 117
		}
	},
	testData: {
		txDisplayTestList: {
			// Will need to be populated with actual Verium test transactions
		}
	},
	genesisCoinbaseOutputAddressScripthash:"0000000000000000000000000000000000000000000000000000000000000000",
	historicalData: veriumFun.items,
	exchangeRateData:{
		jsonUrl:"https://api.coindesk.com/v1/bpi/currentprice.json",
		responseBodySelectorFunction:function(responseBody) {
			// For now, use Bitcoin exchange rates as placeholder for Verium
			// In production, you'd want to use Verium-specific exchange rate APIs
			var exchangedCurrencies = ["USD", "GBP", "EUR"];

			if (responseBody.bpi) {
				var exchangeRates = {};

				for (var i = 0; i < exchangedCurrencies.length; i++) {
					if (responseBody.bpi[exchangedCurrencies[i]]) {
						exchangeRates[exchangedCurrencies[i].toLowerCase()] = responseBody.bpi[exchangedCurrencies[i]].rate_float;
					}
				}

				return exchangeRates;
			}
			
			return null;
		}
	},
	goldExchangeRateData:{
		jsonUrl:"https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD",
		responseBodySelectorFunction:function(responseBody) {
			if (responseBody[0].topo && responseBody[0].topo.platform == "MT5") {
				var prices = responseBody[0].spreadProfilePrices[0];
				
				return {
					usd: prices.ask
				};
			}
			
			return null;
		}
	},
	blockRewardFunction:function(blockHeight, chain) {
		// Verium uses a unique reward mechanism based on block time and supply
		// This is a simplified approximation - actual rewards depend on block time calculation
		if (blockHeight === 1) {
			return new Decimal8(564705); // Special reward for block 1
		}
		
		// For other blocks, Verium uses exponential reward based on block time
		// This is a placeholder - actual implementation would need block time data
		return new Decimal8(0.25); // Base reward, actual calculation is more complex
	}
};
