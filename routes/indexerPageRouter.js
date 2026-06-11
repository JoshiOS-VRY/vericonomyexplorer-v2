'use strict';

const express = require('express');
const asyncHandler = require('express-async-handler');

const indexerQuery = require('./../app/indexerV2/query.js');
const indexerHealth = require('./../app/indexerV2/health.js');
const utils = require('./../app/utils.js');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res, next) => {
    renderLandingPage(req, res, next);
  })
);

router.get(
  ['/vrm', '/verium'],
  asyncHandler(async (req, res, next) => {
    renderChainPage(req, res, next, 'vrm');
  })
);

router.get(
  '/vrm/richlist',
  asyncHandler(async (req, res, next) => {
    renderRichlistPage(req, res, next, 'vrm');
  })
);

router.get(
  '/vrm/leaderboard',
  asyncHandler(async (req, res, next) => {
    renderLeaderboardPage(req, res, next, 'vrm');
  })
);

router.get(
  '/vrm/address/:address',
  asyncHandler(async (req, res, next) => {
    renderAddressPage(req, res, next, 'vrm', req.params.address);
  })
);

router.get(
  '/vrm/tx/:txid',
  asyncHandler(async (req, res, next) => {
    renderTransactionPage(req, res, next, 'vrm', req.params.txid);
  })
);

router.get(
  '/vrm/block/:hashOrHeight',
  asyncHandler(async (req, res, next) => {
    renderBlockPage(req, res, next, 'vrm', req.params.hashOrHeight);
  })
);

router.post('/vrm/search', function (req, res, next) {
  const query = String(req.body.query || '').trim();

  if (!query) {
    req.session.userMessage = 'Enter a Verium block height, block hash, txid, or address.';
    res.redirect('./vrm');
    return;
  }

  try {
    if (/^\d+$/.test(query)) {
      res.redirect(`./vrm/block/${query}`);
      return;
    }

    if (/^[a-fA-F0-9]{64}$/.test(query)) {
      const tx = indexerQuery.getTransaction('vrm', query);
      if (tx.found) {
        res.redirect(`./vrm/tx/${query}`);
        return;
      }

      res.redirect(`./vrm/block/${query}`);
      return;
    }

    const address = indexerQuery.getAddress('vrm', query, { limit: 1 });
    if (address.found) {
      res.redirect(`./vrm/address/${query}`);
      return;
    }

    req.session.userMessage = 'No indexed Verium result found for query: ' + query;
    res.redirect('./vrm');
  } catch (err) {
    utils.logError('vrm-index-search', err);
    req.session.userMessage = 'Search failed: ' + (err.message || err);
    return res.redirect('./vrm');
  }
});

function renderLandingPage(req, res) {
  try {
    res.locals.metaTitle = 'VeriConomy Explorer';
    res.locals.indexerPage = true;
    res.locals.landing = {
      health: indexerHealth.getIndexerHealth(),
      vrmSummary: indexerQuery.getChainSummary('vrm'),
      vrcSummary: indexerQuery.getChainSummary('vrc'),
      vrmRichlist: indexerQuery.getRichlist('vrm', { limit: 5 }),
      vrmLeaderboard: indexerQuery.getLeaderboard('vrm', {
        period: 'month',
        sort: 'activity',
        limit: 5,
      }),
    };
    return res.render('indexer/landing');
  } catch (err) {
    return renderIndexerError(res, err, 'VeriConomy Explorer');
  }
}

function renderChainPage(req, res, next, chainId) {
  try {
    res.locals.metaTitle = 'Verium Index Explorer';
    res.locals.indexerPage = true;
    res.locals.summary = indexerQuery.getChainSummary(chainId);
    res.locals.richlist = indexerQuery.getRichlist(chainId, { limit: 5 });
    res.locals.leaderboard = indexerQuery.getLeaderboard(chainId, {
      period: 'month',
      sort: 'activity',
      limit: 5,
    });
    return res.render('indexer/chain');
  } catch (err) {
    return renderIndexerError(res, err, 'Verium Index Explorer');
  }
}

function renderRichlistPage(req, res, next, chainId) {
  try {
    const limit = normalizeLimit(req.query.limit, 50);
    const offset = normalizeOffset(req.query.offset);

    res.locals.metaTitle = 'Verium Richlist';
    res.locals.indexerPage = true;
    res.locals.limit = limit;
    res.locals.offset = offset;
    res.locals.richlist = indexerQuery.getRichlist(chainId, { limit, offset });
    return res.render('indexer/richlist');
  } catch (err) {
    return renderIndexerError(res, err, 'Verium Richlist');
  }
}

function renderLeaderboardPage(req, res, next, chainId) {
  try {
    const limit = normalizeLimit(req.query.limit, 50);
    const offset = normalizeOffset(req.query.offset);
    const period = req.query.period || 'week';
    const sort = req.query.sort || 'net';

    res.locals.metaTitle = 'Verium Leaderboard';
    res.locals.indexerPage = true;
    res.locals.limit = limit;
    res.locals.offset = offset;
    res.locals.period = period;
    res.locals.sort = sort;
    res.locals.leaderboard = indexerQuery.getLeaderboard(chainId, {
      period,
      sort,
      limit,
      offset,
    });
    return res.render('indexer/leaderboard');
  } catch (err) {
    return renderIndexerError(res, err, 'Verium Leaderboard');
  }
}

function renderAddressPage(req, res, next, chainId, address) {
  try {
    const limit = normalizeLimit(req.query.limit, 25);
    const offset = normalizeOffset(req.query.offset);

    res.locals.metaTitle = `Verium Address ${address}`;
    res.locals.indexerPage = true;
    res.locals.limit = limit;
    res.locals.offset = offset;
    res.locals.addressResult = indexerQuery.getAddress(chainId, address, { limit, offset });
    return res.render('indexer/address');
  } catch (err) {
    return renderIndexerError(res, err, 'Verium Address');
  }
}

function renderTransactionPage(req, res, next, chainId, txid) {
  try {
    res.locals.metaTitle = `Verium Transaction ${utils.ellipsizeMiddle(txid, 16)}`;
    res.locals.indexerPage = true;
    res.locals.txResult = indexerQuery.getTransaction(chainId, txid);
    return res.render('indexer/transaction');
  } catch (err) {
    return renderIndexerError(res, err, 'Verium Transaction');
  }
}

function renderBlockPage(req, res, next, chainId, hashOrHeight) {
  try {
    const limit = normalizeLimit(req.query.limit, 50);
    const offset = normalizeOffset(req.query.offset);

    res.locals.metaTitle = `Verium Block ${hashOrHeight}`;
    res.locals.indexerPage = true;
    res.locals.limit = limit;
    res.locals.offset = offset;
    res.locals.blockResult = indexerQuery.getBlock(chainId, hashOrHeight, { limit, offset });
    return res.render('indexer/block');
  } catch (err) {
    return renderIndexerError(res, err, 'Verium Block');
  }
}

function renderIndexerError(res, err, title) {
  utils.logError('indexer-page', err);
  res.locals.metaTitle = title;
  res.locals.indexerPage = true;
  res.locals.indexerError = err.message || String(err);
  return res.render('indexer/error');
}

function normalizeLimit(value, defaultValue) {
  const limit = Number(value || defaultValue);

  if (!Number.isFinite(limit) || limit < 1) {
    return defaultValue;
  }

  return Math.min(Math.floor(limit), 100);
}

function normalizeOffset(value) {
  const offset = Number(value || 0);

  if (!Number.isFinite(offset) || offset < 0) {
    return 0;
  }

  return Math.floor(offset);
}

module.exports = router;
