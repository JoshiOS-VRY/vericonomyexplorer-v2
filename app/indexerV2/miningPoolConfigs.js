'use strict';

const fs = require('fs');
const path = require('path');

const CHAIN_TICKERS = {
  vrm: 'VRM',
  vrc: 'VRC',
};

const configsByTicker = Object.create(null);
let repoRoot = null;

function getRepoRoot() {
  if (repoRoot) {
    return repoRoot;
  }

  repoRoot = path.resolve(__dirname, '..', '..');
  return repoRoot;
}

function chainIdToTicker(chainId) {
  const normalized = String(chainId || '').toLowerCase();
  return CHAIN_TICKERS[normalized] || normalized.toUpperCase();
}

function getConfigDir(ticker) {
  return path.join(
    getRepoRoot(),
    'public',
    'txt',
    'mining-pools-configs',
    String(ticker).toUpperCase()
  );
}

function readTickerConfigs(ticker) {
  const configDir = getConfigDir(ticker);

  if (!fs.existsSync(configDir)) {
    return [];
  }

  return fs
    .readdirSync(configDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(configDir, file), 'utf8')));
}

function getMiningPoolConfigs(ticker) {
  const key = String(ticker || '').toUpperCase();
  if (!key) {
    return [];
  }

  if (!Object.prototype.hasOwnProperty.call(configsByTicker, key)) {
    configsByTicker[key] = readTickerConfigs(key);
  }

  return configsByTicker[key];
}

function ensureMiningPoolConfigs(ticker) {
  return getMiningPoolConfigs(ticker);
}

function loadAllMiningPoolConfigs() {
  for (const ticker of Object.values(CHAIN_TICKERS)) {
    ensureMiningPoolConfigs(ticker);
  }

  return configsByTicker;
}

/** Config sets for identifyMiner: ticker-specific first, then legacy global. */
function getMiningPoolConfigsForIdentify(ticker) {
  const sets = [];
  const tickerConfigs = getMiningPoolConfigs(ticker);

  if (tickerConfigs.length > 0) {
    sets.push(tickerConfigs);
  }

  if (global.miningPoolsConfigs && global.miningPoolsConfigs.length > 0) {
    sets.push(global.miningPoolsConfigs);
  }

  return sets.length > 0 ? sets : [[]];
}

function mapMinerFields(miner) {
  if (!miner) {
    return {
      extractedBy: null,
      extractedByAddress: null,
    };
  }

  if (miner.type === 'address-only') {
    return {
      extractedBy: null,
      extractedByAddress: miner.name || null,
    };
  }

  return {
    extractedBy: miner.name || null,
    extractedByAddress: null,
  };
}

function resolveMinerLink(extractedBy, extractedByAddress, ticker) {
  const configs = getMiningPoolConfigs(ticker);

  for (const config of configs) {
    for (const [address, info] of Object.entries(config.payout_addresses || {})) {
      if (extractedByAddress === address || extractedBy === info.name) {
        return info.link || null;
      }
    }

    for (const info of Object.values(config.coinbase_tags || {})) {
      if (extractedBy === info.name) {
        return info.link || null;
      }
    }
  }

  return null;
}

function attachMinerLink(block, chainId) {
  if (!block || typeof block !== 'object') {
    return block;
  }

  const ticker = chainIdToTicker(chainId);
  const link = resolveMinerLink(block.extractedBy, block.extractedByAddress, ticker);

  if (!link) {
    return block;
  }

  return Object.assign({}, block, { extractedByLink: link });
}

module.exports = {
  chainIdToTicker,
  getMiningPoolConfigs,
  getMiningPoolConfigsForIdentify,
  ensureMiningPoolConfigs,
  loadAllMiningPoolConfigs,
  mapMinerFields,
  resolveMinerLink,
  attachMinerLink,
};
