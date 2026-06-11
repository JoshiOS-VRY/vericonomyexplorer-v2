'use strict';

const utils = require('../utils.js');
const { attachMinerLink, chainIdToTicker, mapMinerFields } = require('./miningPoolConfigs.js');
const {
  decimalToAtomicUnits,
  atomicUnitsToDecimal,
  getVoutAddresses,
  isCoinbaseTx,
  isCoinstakeTx,
} = require('./valueUtils.js');

const chainUnits = {
  vrc: { ticker: 'VRC', decimalPlaces: 8 },
  vrm: { ticker: 'VRM', decimalPlaces: 8 },
};

const defaultRpcSearchDepth =
  Number(process.env.VCEXP_RPC_SEARCH_DEPTH) > 0 ? Number(process.env.VCEXP_RPC_SEARCH_DEPTH) : 500;

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

function computeRpcConfirmations(tipHeight, blockHeight) {
  if (tipHeight == null || blockHeight == null) {
    return 1;
  }

  return Math.max(1, Number(tipHeight) - Number(blockHeight) + 1);
}

function rpcValueToAtomic(value) {
  return decimalToAtomicUnits(value == null ? 0 : value);
}

function mapRpcVin(chainId, vin, index) {
  if (vin.coinbase != null) {
    return {
      n: index,
      prevTxid: null,
      prevVout: null,
      address: null,
      valueAtomic: null,
      value: null,
      source: 'rpc',
      resolved: false,
    };
  }

  const valueAtomic = vin.value != null ? rpcValueToAtomic(vin.value) : null;

  return {
    n: index,
    prevTxid: vin.txid || null,
    prevVout: vin.vout == null ? null : Number(vin.vout),
    address: vin.address || (vin.scriptPubKey && vin.scriptPubKey.address) || null,
    valueAtomic: valueAtomic == null ? null : valueAtomic.toString(),
    value: valueAtomic == null ? null : formatRpcAtomic(chainId, valueAtomic),
    source: 'rpc',
    resolved: valueAtomic != null,
  };
}

function mapRpcVout(chainId, vout, index) {
  const addresses = getVoutAddresses(vout);
  const valueAtomic = rpcValueToAtomic(vout.value);

  return {
    n: index,
    address: addresses[0] || null,
    valueAtomic: valueAtomic.toString(),
    value: formatRpcAtomic(chainId, valueAtomic),
    scriptType: vout.scriptPubKey && vout.scriptPubKey.type ? vout.scriptPubKey.type : null,
    scriptPubKey: vout.scriptPubKey && vout.scriptPubKey.hex ? vout.scriptPubKey.hex : null,
    spentByTxid: null,
    spentByVin: null,
    spentHeight: null,
    isSpent: false,
  };
}

function computeRpcTransactionTotals(chainId, vins, vouts) {
  let inputAtomic = 0n;
  let outputAtomic = 0n;

  for (const vin of vins) {
    if (vin.valueAtomic != null) {
      inputAtomic += BigInt(vin.valueAtomic);
    }
  }

  for (const vout of vouts) {
    outputAtomic += BigInt(vout.valueAtomic);
  }

  const feeAtomic = inputAtomic >= outputAtomic ? inputAtomic - outputAtomic : 0n;

  return {
    inputAtomic: inputAtomic.toString(),
    outputAtomic: outputAtomic.toString(),
    feeAtomic: feeAtomic.toString(),
    input: formatRpcAtomic(chainId, inputAtomic),
    output: formatRpcAtomic(chainId, outputAtomic),
    fee: formatRpcAtomic(chainId, feeAtomic),
  };
}

function buildRpcAddressEvents(chainId, vins, vouts) {
  const events = [];

  for (const vout of vouts) {
    if (!vout.address) {
      continue;
    }

    events.push({
      address: vout.address,
      deltaAtomic: vout.valueAtomic,
      delta: vout.value,
      eventType: 'receive',
    });
  }

  for (const vin of vins) {
    if (!vin.address || vin.valueAtomic == null) {
      continue;
    }

    events.push({
      address: vin.address,
      deltaAtomic: (-BigInt(vin.valueAtomic)).toString(),
      delta: formatRpcAtomic(chainId, -BigInt(vin.valueAtomic)),
      eventType: 'spend',
    });
  }

  return events;
}

function buildRpcTransactionSummary(chainId, tx) {
  const vouts = Array.isArray(tx.vout) ? tx.vout : [];
  let outputAtomic = 0n;

  for (const vout of vouts) {
    outputAtomic += rpcValueToAtomic(vout.value);
  }

  return {
    outputCount: vouts.length,
    totalOutputAtomic: outputAtomic.toString(),
    totalOutput: formatRpcAtomic(chainId, outputAtomic),
  };
}

function mapRpcTransactionEntity(chainId, tx, block, txIndex, tipHeight) {
  const blockHeight = Number(block.height);
  const vins = (Array.isArray(tx.vin) ? tx.vin : []).map((vin, index) =>
    mapRpcVin(chainId, vin, index)
  );
  const vouts = (Array.isArray(tx.vout) ? tx.vout : []).map((vout, index) =>
    mapRpcVout(chainId, vout, index)
  );
  const isCoinbase = isCoinbaseTx(tx);
  const isCoinstake = isCoinstakeTx(tx);
  const txid = tx.txid;
  const txids = Array.isArray(block.tx)
    ? block.tx.map((entry) => (typeof entry === 'string' ? entry : entry.txid))
    : [];

  return {
    chainId: String(chainId).toLowerCase(),
    found: true,
    trusted: true,
    source: { label: 'live', type: 'rpc', trustLevel: 'live' },
    transaction: {
      txid,
      blockHeight,
      blockHash: block.hash,
      txIndex,
      time: tx.time == null ? Number(block.time) : Number(tx.time),
      isCoinbase,
      isCoinstake,
      source: 'rpc',
    },
    inputs: vins,
    outputs: vouts,
    addressEvents: buildRpcAddressEvents(chainId, vins, vouts),
    totals: computeRpcTransactionTotals(chainId, vins, vouts),
    confirmations: computeRpcConfirmations(tipHeight, blockHeight),
    siblings: {
      prevTxid: txIndex > 0 ? txids[txIndex - 1] : null,
      nextTxid: txIndex + 1 < txids.length ? txids[txIndex + 1] : null,
    },
    changeOutputs: isCoinbase
      ? []
      : vouts
          .filter((vout) => vout.address && vins.some((vin) => vin.address === vout.address))
          .map((vout) => vout.n),
  };
}

function buildRpcBlockTotals(chainId, txs) {
  let outputAtomic = 0n;
  let inputAtomic = 0n;

  for (const tx of txs) {
    if (!tx || typeof tx !== 'object') {
      continue;
    }

    for (const vout of Array.isArray(tx.vout) ? tx.vout : []) {
      outputAtomic += rpcValueToAtomic(vout.value);
    }

    for (const vin of Array.isArray(tx.vin) ? tx.vin : []) {
      if (vin.coinbase == null && vin.value != null) {
        inputAtomic += rpcValueToAtomic(vin.value);
      }
    }
  }

  const feeAtomic = inputAtomic >= outputAtomic ? inputAtomic - outputAtomic : 0n;

  return {
    feeAtomic: feeAtomic.toString(),
    fee: formatRpcAtomic(chainId, feeAtomic),
    outputValueAtomic: outputAtomic.toString(),
    outputValue: formatRpcAtomic(chainId, outputAtomic),
  };
}

function countBlockOutputsFromTxs(txs) {
  let count = 0;

  for (const tx of txs) {
    if (tx && Array.isArray(tx.vout)) {
      count += tx.vout.length;
    }
  }

  return count > 0 ? count : null;
}

function mapRpcBlockTransactions(chainId, block, txs, offset, limit, txsArePaged = false) {
  const pageTxs = txsArePaged ? txs : txs.slice(offset, offset + limit);

  return pageTxs.map((tx, pageIndex) => {
    const txIndex = offset + pageIndex;
    const isCoinbase = txIndex === 0 || isCoinbaseTx(tx);
    const isCoinstake = isCoinstakeTx(tx);

    return {
      txid: tx.txid,
      blockHeight: Number(block.height),
      blockHash: block.hash,
      txIndex,
      time: tx.time == null ? Number(block.time) : Number(tx.time),
      isCoinbase,
      isCoinstake,
      source: 'rpc',
      summary: buildRpcTransactionSummary(chainId, tx),
    };
  });
}

function buildRpcCoinbaseSummary(chainId, txs) {
  const coinbaseTx = txs.find((tx) => tx && isCoinbaseTx(tx));
  if (!coinbaseTx) {
    return null;
  }

  let rewardAtomic = 0n;
  for (const vout of Array.isArray(coinbaseTx.vout) ? coinbaseTx.vout : []) {
    rewardAtomic += rpcValueToAtomic(vout.value);
  }

  return {
    txid: coinbaseTx.txid,
    rewardAtomic: rewardAtomic.toString(),
    reward: formatRpcAtomic(chainId, rewardAtomic),
  };
}

function buildRpcBlockResult(chainId, block, options = {}) {
  const txs = Array.isArray(block.tx)
    ? block.tx.map((entry) => (typeof entry === 'string' ? { txid: entry } : entry))
    : [];
  const fullTxs = txs.every((tx) => Array.isArray(tx.vout));
  const limit = options.limit ?? 25;
  const offset = options.offset ?? 0;
  const tipHeight = options.tipHeight;
  const coinbaseTx = fullTxs ? txs.find((tx) => isCoinbaseTx(tx)) : null;
  const ticker = chainIdToTicker(chainId);
  const miner = coinbaseTx ? utils.identifyMiner(coinbaseTx, Number(block.height), ticker) : null;
  const mapped = mapMinerFields(miner);

  return {
    chainId: String(chainId).toLowerCase(),
    found: true,
    trusted: true,
    source: { label: 'live', type: 'rpc', trustLevel: 'live' },
    block: attachMinerLink(
      {
        height: Number(block.height),
        hash: block.hash,
        previousHash: block.previousblockhash || null,
        nextHash: options.nextHash ?? null,
        time: Number(block.time),
        txCount: block.nTx != null ? Number(block.nTx) : txs.length,
        size: block.size == null ? null : Number(block.size),
        difficulty: block.difficulty == null ? null : String(block.difficulty),
        outputCount: fullTxs ? countBlockOutputsFromTxs(txs) : null,
        extractedBy: mapped.extractedBy,
        extractedByAddress: mapped.extractedByAddress,
      },
      chainId
    ),
    transactions: fullTxs
      ? mapRpcBlockTransactions(chainId, block, txs, offset, limit, options.txsArePaged === true)
      : txs.slice(offset, offset + limit).map((tx, pageIndex) => ({
          txid: tx.txid,
          blockHeight: Number(block.height),
          blockHash: block.hash,
          txIndex: offset + pageIndex,
          time: Number(block.time),
          isCoinbase: offset + pageIndex === 0,
          isCoinstake: false,
          source: 'rpc',
        })),
    paging: {
      limit,
      offset,
      total: options.totalTxCount ?? txs.length,
      hasMore: offset + limit < (options.totalTxCount ?? txs.length),
    },
    confirmations: computeRpcConfirmations(tipHeight, block.height),
    coinbase: fullTxs ? buildRpcCoinbaseSummary(chainId, txs) : null,
    totals: fullTxs ? buildRpcBlockTotals(chainId, txs) : null,
  };
}

async function lookupRpcTransaction(rpc, chainId, txid, options = {}) {
  const cleanTxid = String(txid || '')
    .trim()
    .toLowerCase();
  const searchDepth = options.searchDepth ?? defaultRpcSearchDepth;

  try {
    const tx = await rpc.call('getrawtransaction', [cleanTxid, true]);
    const tipHeight = Number(await rpc.call('getblockcount'));
    const blockHash = tx.blockhash;
    if (!blockHash) {
      return null;
    }

    const block = await rpc.call('getblock', [blockHash, 1]);
    const txids = Array.isArray(block.tx) ? block.tx : [];
    const txIndex = txids.indexOf(cleanTxid);

    return mapRpcTransactionEntity(chainId, tx, block, txIndex >= 0 ? txIndex : 0, tipHeight);
  } catch (err) {
    /* fall through to block scan */
  }

  const tipHeight = Number(await rpc.call('getblockcount'));
  for (let height = tipHeight; height > Math.max(tipHeight - searchDepth, 0); height--) {
    const hash = await rpc.call('getblockhash', [height]);
    try {
      const tx = await rpc.call('getrawtransaction', [cleanTxid, true, hash]);
      const block = await rpc.call('getblock', [hash, 1]);
      const txids = Array.isArray(block.tx) ? block.tx : [];
      const txIndex = txids.indexOf(cleanTxid);

      return mapRpcTransactionEntity(chainId, tx, block, txIndex >= 0 ? txIndex : 0, tipHeight);
    } catch (scanErr) {
      /* keep scanning */
    }
  }

  return null;
}

async function fetchBlocksInRange(rpc, startHeight, tipHeight, verbosity = 2) {
  const heights = [];
  for (let height = startHeight; height <= tipHeight; height++) {
    heights.push(height);
  }

  if (heights.length === 0) {
    return [];
  }

  if (typeof rpc.batch === 'function') {
    const hashes = await rpc.batch(
      heights.map((height) => ({ method: 'getblockhash', params: [height] }))
    );
    const blocks = await rpc.batch(
      hashes.map((hash) => ({ method: 'getblock', params: [hash, verbosity] }))
    );

    return blocks.map((block, index) => ({
      block,
      height: heights[index],
    }));
  }

  const results = [];
  for (const height of heights) {
    const hash = await rpc.call('getblockhash', [height]);
    const block = await rpc.call('getblock', [hash, verbosity]);
    results.push({ block, height });
  }

  return results;
}

async function lookupRpcAddress(rpc, chainId, address, options = {}) {
  const cleanAddress = String(address || '').trim();
  const searchDepth = options.searchDepth ?? defaultRpcSearchDepth;
  const limit = Math.max(1, Math.min(Number(options.limit) || 25, 100));
  const offset = Math.max(0, Number(options.offset) || 0);

  let validated;
  try {
    validated = await rpc.call('validateaddress', [cleanAddress]);
  } catch (err) {
    return null;
  }

  if (!validated || !validated.isvalid) {
    return null;
  }

  const tipHeight = Number(await rpc.call('getblockcount'));
  const utxos = new Map();
  const transactions = [];
  let totalReceived = 0n;
  let totalSent = 0n;
  let firstSeenHeight = null;
  let firstSeenTime = null;
  let lastSeenHeight = null;
  const startHeight = Math.max(tipHeight - searchDepth, 0);
  const blockEntries = await fetchBlocksInRange(rpc, startHeight, tipHeight, 2);

  for (const { block, height } of blockEntries) {
    const blockTime = Number(block.time);

    for (const tx of Array.isArray(block.tx) ? block.tx : []) {
      if (!tx || typeof tx !== 'object') {
        continue;
      }

      let netDelta = 0n;
      let touched = false;

      for (const vout of Array.isArray(tx.vout) ? tx.vout : []) {
        const addresses = getVoutAddresses(vout);
        if (!addresses.includes(cleanAddress)) {
          continue;
        }

        touched = true;
        const valueAtomic = rpcValueToAtomic(vout.value);
        const key = `${tx.txid}:${vout.n}`;
        utxos.set(key, valueAtomic);
        netDelta += valueAtomic;
        totalReceived += valueAtomic;
      }

      for (const vin of Array.isArray(tx.vin) ? tx.vin : []) {
        if (!vin.txid || vin.vout == null) {
          continue;
        }

        const key = `${vin.txid}:${vin.vout}`;
        if (!utxos.has(key)) {
          continue;
        }

        touched = true;
        const valueAtomic = utxos.get(key);
        utxos.delete(key);
        netDelta -= valueAtomic;
        totalSent += valueAtomic;
      }

      if (!touched) {
        continue;
      }

      if (firstSeenHeight == null || height < firstSeenHeight) {
        firstSeenHeight = height;
        firstSeenTime = blockTime;
      }

      if (lastSeenHeight == null || height > lastSeenHeight) {
        lastSeenHeight = height;
      }

      transactions.push({
        txid: tx.txid,
        blockHeight: height,
        blockHash: block.hash,
        txIndex: null,
        time: tx.time == null ? blockTime : Number(tx.time),
        netDeltaAtomic: netDelta.toString(),
        netDelta: formatRpcAtomic(chainId, netDelta),
        isCoinbase: isCoinbaseTx(tx),
        isCoinstake: isCoinstakeTx(tx),
      });
    }
  }

  transactions.sort((a, b) => b.blockHeight - a.blockHeight || 0);

  if (transactions.length === 0) {
    return null;
  }

  let balanceAtomic = 0n;
  for (const valueAtomic of utxos.values()) {
    balanceAtomic += valueAtomic;
  }

  const paged = transactions.slice(offset, offset + limit);

  return {
    chainId: String(chainId).toLowerCase(),
    address: cleanAddress,
    found: true,
    trusted: true,
    source: { label: 'live', type: 'rpc', trustLevel: 'live' },
    balance: {
      address: cleanAddress,
      balance: formatRpcAtomic(chainId, balanceAtomic),
      balanceAtomic: balanceAtomic.toString(),
      totalReceived: formatRpcAtomic(chainId, totalReceived),
      totalReceivedAtomic: totalReceived.toString(),
      totalSent: formatRpcAtomic(chainId, totalSent),
      totalSentAtomic: totalSent.toString(),
      txCount: transactions.length,
      firstSeenHeight,
      firstSeenTime,
      lastSeenHeight,
    },
    richlist: {
      enabled: false,
      eligible: null,
      rank: null,
      total: null,
      percentile: null,
    },
    paging: {
      limit,
      offset,
      total: transactions.length,
      hasMore: offset + limit < transactions.length,
    },
    transactions: paged,
  };
}

module.exports = {
  defaultRpcSearchDepth,
  buildRpcBlockResult,
  lookupRpcTransaction,
  lookupRpcAddress,
  computeRpcConfirmations,
  mapRpcTransactionEntity,
};
