'use strict';

const debug = require('debug');
const debugLog = debug('btcexp:router');

const express = require('express');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const qrcode = require('qrcode');
const bitcoinjs = require('bitcoinjs-lib');
const sha256 = require('crypto-js/sha256');
const hexEnc = require('crypto-js/enc-hex');
const Decimal = require('decimal.js');
const asyncHandler = require('express-async-handler');

const utils = require('./../app/utils.js');
const coins = require('./../app/coins.js');
const config = require('./../app/config.js');
const coreApi = require('./../app/api/coreApi.js');
const addressApi = require('./../app/api/addressApi.js');
const btcQuotes = require('./../app/coins/btcQuotes.js');

router.get('/formatCurrencyAmount/:amt', function (req, res, next) {
  res.locals.currencyValue = req.params.amt;

  res.render('includes/value-display');

  next();
});

router.get(
  '/hashrate',
  asyncHandler(async (req, res, next) => {
    try {
      const result = {};
      const coinConfig = coins[config.coin];
      const targetBlockTimeSeconds = coinConfig.targetBlockTimeSeconds || 600; // Default to 10 minutes if not set

      // Calculate block counts based on Verium's 5-minute block time
      // For Verium: 1 day = 288 blocks (24 * 60 / 5), 7 days = 2016 blocks
      // For Bitcoin: 1 day = 144 blocks (24 * 60 / 10), 7 days = 1008 blocks
      const blocksPerDay = Math.floor((24 * 60 * 60) / targetBlockTimeSeconds);
      const blocks7Days = blocksPerDay * 7;
      const blocks1Day = blocksPerDay;

      // Try to get hashrate from getMiningInfo first (some nodes include networkhashps)
      try {
        const miningInfo = await coreApi.getMiningInfo();
        if (miningInfo && miningInfo.networkhashps && miningInfo.networkhashps > 0) {
          result.currentHashrate = miningInfo.networkhashps;
        }
      } catch (err) {
        utils.logError('hashrate.getMiningInfo', err);
      }

      // Get hashrate from networkhashps RPC
      try {
        // Get 7-day average for comparison
        result.hashrate7d = await coreApi.getNetworkHashrate(blocks7Days);

        // Use 1-day blocks for current hashrate estimate if we don't have it yet
        if (!result.currentHashrate || result.currentHashrate <= 0) {
          const hashrate = await coreApi.getNetworkHashrate(blocks1Day);
          if (hashrate && hashrate > 0) {
            result.currentHashrate = hashrate;
          }
        }

        // If still no current hashrate, try using difficulty-based calculation
        // Hashrate = (Difficulty * 2^32) / Target Block Time
        if (!result.currentHashrate || result.currentHashrate <= 0) {
          try {
            const blockchainInfo = await coreApi.getBlockchainInfo();
            if (blockchainInfo && blockchainInfo.difficulty) {
              // Calculate hashrate from difficulty: Hashrate = (Difficulty * 2^32) / Target Block Time
              const difficulty = parseFloat(blockchainInfo.difficulty);
              const twoTo32 = Math.pow(2, 32);
              const calculatedHashrate = (difficulty * twoTo32) / targetBlockTimeSeconds;

              if (calculatedHashrate > 0) {
                result.currentHashrate = calculatedHashrate;
              }
            }
          } catch (err) {
            utils.logError('hashrate.difficulty-calculation', err);
          }
        }

        // If still no current hashrate, use 7-day as fallback
        if (
          (!result.currentHashrate || result.currentHashrate <= 0) &&
          result.hashrate7d &&
          result.hashrate7d > 0
        ) {
          result.currentHashrate = result.hashrate7d;
        }
      } catch (err) {
        utils.logError('hashrate.getNetworkHashrate', err);
      }

      // Convert hashrate from H/s to KH/m for display (to match VeriConomy format)
      // Formula: H/s * 60 / 1000 = KH/m
      if (result.currentHashrate && result.currentHashrate > 0) {
        res.locals.currentHashrate = (result.currentHashrate * 60) / 1000; // Convert to KH/m
        res.locals.currentHashrateUnit = 'KH/m';
      } else {
        res.locals.currentHashrate = null;
        res.locals.currentHashrateUnit = 'KH/m';
      }

      if (result.hashrate7d && result.hashrate7d > 0) {
        res.locals.hashrate7d = (result.hashrate7d * 60) / 1000; // Convert to KH/m
      } else {
        res.locals.hashrate7d = null;
      }

      res.render('snippets/index-hashrate');
    } catch (err) {
      utils.logError('hashrate.route', err);
      res.locals.currentHashrate = null;
      res.locals.hashrate7d = null;
      res.render('snippets/index-hashrate');
    }

    next();
  })
);

router.get(
  '/next-block',
  asyncHandler(async (req, res, next) => {
    const promises = [];

    const result = {};

    promises.push(
      utils.timePromise('api/next-block/getblocktemplate', async () => {
        let nextBlockEstimate = await utils.timePromise(
          'api/next-block/getNextBlockEstimate',
          async () => {
            return await coreApi.getNextBlockEstimate();
          }
        );

        result.txCount = nextBlockEstimate.blockTemplate.transactions.length;

        result.totalWeight = nextBlockEstimate.weight;

        result.minFeeRate = nextBlockEstimate.minFeeRate;
        result.maxFeeRate = nextBlockEstimate.maxFeeRate;
        result.medianFeeRate = nextBlockEstimate.medianFeeRate;
        result.minFeeTxid = nextBlockEstimate.minFeeTxid;
        result.maxFeeTxid = nextBlockEstimate.maxFeeTxid;

        result.totalFees = nextBlockEstimate.totalFees.toNumber();
      })
    );

    await utils.awaitPromises(promises);

    res.locals.minFeeRate = result.minFeeRate;
    res.locals.maxFeeRate = result.maxFeeRate;
    res.locals.medianFeeRate = result.medianFeeRate;
    res.locals.txCount = result.txCount;
    res.locals.totalWeight = result.totalWeight;
    res.locals.totalFees = result.totalFees;

    res.render('snippets/index-next-block');
  })
);

router.get(
  '/index-halving-countdown',
  asyncHandler(async (req, res, next) => {
    try {
      const getblockchaininfo = await utils.timePromise(
        'snippet.index-halving-countdown.getBlockchainInfo',
        async () => {
          return await coreApi.getBlockchainInfo();
        }
      );

      let promises = [];

      res.locals.getblockchaininfo = getblockchaininfo;
      res.locals.difficultyPeriod = parseInt(
        Math.floor(getblockchaininfo.blocks / coinConfig.difficultyAdjustmentBlockCount)
      );

      let blockHeights = [];
      if (getblockchaininfo.blocks) {
        for (let i = 0; i < 1; i++) {
          blockHeights.push(getblockchaininfo.blocks - i);
        }
      } else if (global.activeBlockchain == 'regtest') {
        // hack: default regtest node returns getblockchaininfo.blocks=0, despite
        // having a genesis block; hack this to display the genesis block
        blockHeights.push(0);
      }

      promises.push(
        utils.timePromise('snippet.index-halving-countdown.getBlockHeaderByHeight', async () => {
          let h = coinConfig.difficultyAdjustmentBlockCount * res.locals.difficultyPeriod;
          res.locals.difficultyPeriodFirstBlockHeader = await coreApi.getBlockHeaderByHeight(h);
        })
      );

      promises.push(
        utils.timePromise('snippet.index-halving-countdown.getBlocksByHeight', async () => {
          const latestBlocks = await coreApi.getBlocksByHeight(blockHeights);

          res.locals.latestBlocks = latestBlocks;
        })
      );

      await utils.awaitPromises(promises);

      let nextHalvingData = utils.nextHalvingEstimates(
        res.locals.difficultyPeriodFirstBlockHeader,
        res.locals.latestBlocks[0]
      );

      res.locals.nextHalvingData = nextHalvingData;

      await utils.timePromise('snippet.index-halving-countdown.render', async () => {
        res.render('snippets/index-halving-countdown');
      });
    } catch (e) {
      res.locals.pageErrors.push(utils.logError('390wrgehburfuge', e));

      await utils.timePromise('snippet.index-halving-countdown.render', async () => {
        res.render('snippets/index-halving-countdown');
      });
    }
  })
);

router.get(
  '/utxo-set',
  asyncHandler(async (req, res, next) => {
    const promises = [];

    promises.push(
      utils.timePromise('api/utxo-set', async () => {
        if (global.utxoSetSummary) {
          res.locals.utxoSetSummary = global.utxoSetSummary;
        } else {
          res.locals.utxoSetSummary = await coreApi.getUtxoSetSummary(true, true);
        }
      })
    );

    await utils.awaitPromises(promises);

    res.render('snippets/utxo-set');
  })
);

router.get(
  '/timezone-refresh-toast',
  asyncHandler(async (req, res, next) => {
    res.render('snippets/tz-update-toast');
  })
);

router.get(
  '/timestamp',
  asyncHandler(async (req, res, next) => {
    res.locals.timestamp = req.query.timestamp;
    res.locals.includeAgo = req.query.includeAgo ? req.query.includeAgo == 'true' : true;
    res.locals.formatString = req.query.formatString;

    res.render('snippets/timestamp');
  })
);

module.exports = router;
