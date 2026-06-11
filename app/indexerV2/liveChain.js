'use strict';

const utils = require('../utils.js');
const { getChainConfig, getRpcCredentials } = require('./chainConfig.js');
const { createRpcClient } = require('./rpcClient.js');
const { atomicUnitsToDecimal } = require('./valueUtils.js');
const { attachMinerLink, chainIdToTicker, mapMinerFields } = require('./miningPoolConfigs.js');
const {
  buildRpcBlockResult,
  lookupRpcTransaction,
  lookupRpcAddress,
} = require('./rpcLiveEntities.js');

const chainUnits = {
  vrc: { ticker: 'VRC', decimalPlaces: 8 },
  vrm: { ticker: 'VRM', decimalPlaces: 8 },
};

async function getTip(chainId, options = {}) {
  const rpc = getClient(chainId, options);
  const height = await rpc.call('getblockcount');
  const hash = await rpc.call('getblockhash', [height]);

  return {
    height: Number(height),
    hash,
  };
}

async function getRecentBlocks(chainId, count = 10, options = {}) {
  const rpc = getClient(chainId, options);
  const verbosity = options.blockVerbosity ?? 2;
  const tipHeight =
    options.tipHeight != null ? Number(options.tipHeight) : Number(await rpc.call('getblockcount'));
  const maxCount = Math.max(1, Math.min(count, 50));
  let startHeight;

  if (options.fromHeight != null) {
    startHeight = Math.max(0, Number(options.fromHeight));
  } else {
    startHeight = Math.max(0, tipHeight - maxCount + 1);
  }

  const heights = [];
  for (let height = tipHeight; height >= startHeight && heights.length < maxCount; height--) {
    heights.push(height);
  }

  if (heights.length === 0) {
    return [];
  }

  if (typeof rpc.batch === 'function') {
    const hashResults = await rpc.batch(
      heights.map((height) => ({ method: 'getblockhash', params: [height] }))
    );
    const blockResults = await rpc.batch(
      hashResults.map((hash) => ({ method: 'getblock', params: [hash, verbosity] }))
    );
    return blockResults.map((block) => mapRpcBlock(block, verbosity, chainId));
  }

  const blocks = await Promise.all(
    heights.map(async (height) => {
      const hash = await rpc.call('getblockhash', [height]);
      const block = await rpc.call('getblock', [hash, verbosity]);
      return mapRpcBlock(block, verbosity, chainId);
    })
  );

  return blocks;
}

async function enrichBlockMiners(chainId, blocks, options = {}) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return blocks;
  }

  const needsMiner = blocks.filter(
    (block) => block && (!block.extractedBy || !block.extractedByLink)
  );
  if (needsMiner.length === 0) {
    return blocks;
  }

  const rpc = getClient(chainId, options);
  const hashes = needsMiner.map((block) => block.hash);
  let fullBlocks;

  if (typeof rpc.batch === 'function') {
    fullBlocks = await rpc.batch(hashes.map((hash) => ({ method: 'getblock', params: [hash, 2] })));
  } else {
    fullBlocks = await Promise.all(hashes.map((hash) => rpc.call('getblock', [hash, 2])));
  }

  const minerByHash = Object.fromEntries(
    fullBlocks.map((block) => {
      const mapped = mapRpcBlock(block, 2, chainId);
      return [mapped.hash, mapped];
    })
  );

  return blocks.map((block) => {
    const enriched = minerByHash[block.hash];
    if (!enriched) {
      return block;
    }

    return Object.assign({}, block, {
      outputCount: block.outputCount ?? enriched.outputCount ?? null,
      extractedBy: enriched.extractedBy ?? block.extractedBy ?? null,
      extractedByAddress: enriched.extractedBy
        ? null
        : (block.extractedByAddress ?? enriched.extractedByAddress ?? null),
      extractedByLink: enriched.extractedByLink ?? block.extractedByLink ?? null,
    });
  });
}

function mapRpcBlock(block, verbosity = 2, chainId = 'vrm') {
  const txs = Array.isArray(block.tx) ? block.tx : [];
  const coinbaseTx = verbosity >= 2 && txs.length > 0 && typeof txs[0] === 'object' ? txs[0] : null;
  const ticker = chainIdToTicker(chainId);
  const miner = coinbaseTx ? utils.identifyMiner(coinbaseTx, Number(block.height), ticker) : null;
  const mapped = mapMinerFields(miner);

  return attachMinerLink(
    {
      height: Number(block.height),
      hash: block.hash,
      previousHash: block.previousblockhash || null,
      nextHash: null,
      time: Number(block.time),
      txCount: block.nTx != null ? Number(block.nTx) : txs.length,
      size: block.size == null ? null : Number(block.size),
      difficulty: block.difficulty == null ? null : String(block.difficulty),
      outputCount: verbosity >= 2 ? countBlockOutputs(block) : null,
      extractedBy: mapped.extractedBy,
      extractedByAddress: mapped.extractedByAddress,
    },
    chainId
  );
}

function countBlockOutputs(block) {
  if (!Array.isArray(block.tx)) {
    return null;
  }

  let count = 0;
  for (const tx of block.tx) {
    if (tx && Array.isArray(tx.vout)) {
      count += tx.vout.length;
    }
  }

  return count;
}

function getClient(chainId, options = {}) {
  if (options.rpc) {
    return options.rpc;
  }

  const chainConfig = getChainConfig(chainId, options.configPath);
  return createRpcClient(getRpcCredentials(chainConfig));
}

const rpcBlockDefaultLimit = 25;
const rpcBlockMaxLimit = 100;

function normalizeRpcBlockLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return rpcBlockDefaultLimit;
  }

  return Math.min(Math.floor(parsed), rpcBlockMaxLimit);
}

function normalizeRpcBlockOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function getRpcBlockPaging(limit, offset, total) {
  return {
    limit,
    offset,
    total,
    hasMore: offset + limit < total,
  };
}

function formatRpcAtomic(chainId, value) {
  const unit = chainUnits[chainId] || {
    ticker: String(chainId).toUpperCase(),
    decimalPlaces: 8,
  };

  return {
    amount: atomicUnitsToDecimal(value, unit.decimalPlaces),
    ticker: unit.ticker,
    decimalPlaces: unit.decimalPlaces,
  };
}

function sumRpcOutputSats(vouts) {
  if (!Array.isArray(vouts)) {
    return 0n;
  }

  let total = 0n;
  for (const vout of vouts) {
    const value = Number(vout.value);
    if (!Number.isFinite(value)) {
      continue;
    }

    total += BigInt(Math.round(value * 100000000));
  }

  return total;
}

async function getBlockFromRpc(chainId, hashOrHeight, options = {}) {
  const rpc = getClient(chainId, options);
  const value = String(hashOrHeight || '').trim();

  if (!value) {
    return { chainId, query: value, found: false };
  }

  let hash = value;
  if (/^\d+$/.test(value)) {
    hash = await rpc.call('getblockhash', [Number(value)]);
  }

  const tipHeight = Number(await rpc.call('getblockcount'));
  const limit = normalizeRpcBlockLimit(options.limit);
  const offset = normalizeRpcBlockOffset(options.offset);

  const headerBlock = await rpc.call('getblock', [hash, 1]);
  const txCount =
    headerBlock.nTx != null
      ? Number(headerBlock.nTx)
      : Array.isArray(headerBlock.tx)
        ? headerBlock.tx.length
        : 0;
  const verbosity = txCount <= 100 ? 2 : 1;
  const block = verbosity === 2 ? await rpc.call('getblock', [hash, 2]) : headerBlock;

  let nextHash = null;
  try {
    nextHash = await rpc.call('getblockhash', [Number(block.height) + 1]);
  } catch (err) {
    nextHash = null;
  }

  if (verbosity === 1 && Array.isArray(headerBlock.tx) && headerBlock.tx.length > 0) {
    const pageTxids = headerBlock.tx.slice(offset, offset + limit);
    const decodedTxs =
      typeof rpc.batch === 'function'
        ? await rpc.batch(
            pageTxids.map((txid) => ({
              method: 'getrawtransaction',
              params: [txid, true, hash],
            }))
          )
        : await Promise.all(
            pageTxids.map((txid) => rpc.call('getrawtransaction', [txid, true, hash]))
          );

    return buildRpcBlockResult(
      chainId,
      {
        ...headerBlock,
        tx: decodedTxs,
      },
      {
        limit,
        offset,
        nextHash,
        tipHeight,
        totalTxCount: txCount,
        txsArePaged: true,
      }
    );
  }

  return buildRpcBlockResult(chainId, block, {
    limit,
    offset,
    nextHash,
    tipHeight,
  });
}

async function getTransactionFromRpc(chainId, txid, options = {}) {
  const rpc = getClient(chainId, options);
  const result = await lookupRpcTransaction(rpc, chainId, txid, options);

  if (!result) {
    return {
      chainId: String(chainId).toLowerCase(),
      txid: String(txid || '')
        .trim()
        .toLowerCase(),
      found: false,
      trusted: true,
      source: { label: 'live', type: 'rpc', trustLevel: 'live' },
    };
  }

  return result;
}

async function getAddressFromRpc(chainId, address, options = {}) {
  const rpc = getClient(chainId, options);
  const result = await lookupRpcAddress(rpc, chainId, address, options);

  if (!result) {
    return {
      chainId: String(chainId).toLowerCase(),
      address: String(address || '').trim(),
      found: false,
      trusted: true,
      source: { label: 'live', type: 'rpc', trustLevel: 'live' },
      balance: {
        address: String(address || '').trim(),
        balance: formatRpcAtomic(chainId, 0n),
        balanceAtomic: '0',
        totalReceived: formatRpcAtomic(chainId, 0n),
        totalReceivedAtomic: '0',
        totalSent: formatRpcAtomic(chainId, 0n),
        totalSentAtomic: '0',
        txCount: 0,
        firstSeenHeight: null,
        firstSeenTime: null,
        lastSeenHeight: null,
      },
      richlist: {
        enabled: false,
        eligible: null,
        rank: null,
        total: null,
        percentile: null,
      },
      paging: {
        limit: Math.max(1, Math.min(Number(options.limit) || 25, 100)),
        offset: Math.max(0, Number(options.offset) || 0),
        total: 0,
        hasMore: false,
      },
      transactions: [],
    };
  }

  return result;
}

function mapRpcTransaction(tx, block, txIndex) {
  const isCoinbase = Array.isArray(tx.vin) && tx.vin.length === 1 && tx.vin[0].coinbase != null;

  return {
    txid: tx.txid,
    blockHeight: Number(block.height),
    blockHash: block.hash,
    txIndex,
    time: tx.time == null ? Number(block.time) : Number(tx.time),
    isCoinbase,
    isCoinstake: false,
    source: 'rpc',
  };
}

module.exports = {
  getTip,
  getRecentBlocks,
  enrichBlockMiners,
  getBlockFromRpc,
  getTransactionFromRpc,
  getAddressFromRpc,
  mapRpcBlock,
};
