"use strict";

const dbModule = require("./db.js");
const health = require("./health.js");
const liveChain = require("./liveChain.js");
const indexerQuery = require("./query.js");

async function getChainSummary(chainId, options = {}) {
  const summary = indexerQuery.getChainSummary(chainId, options);
  let tip = options.tip ?? null;

  if (!tip) {
    try {
      tip = await liveChain.getTip(chainId, options);
    } catch (err) {
      /* keep indexed health when live tip lookup fails */
    }
  }

  if (tip) {
    try {
      summary.health = health.enrichWithLiveRpc(
        summary.health,
        tip.height,
        options,
      );
    } catch (err) {
      /* keep indexed health when live enrichment fails */
    }

    try {
      const indexedHeight = summary.health.heights.maxIndexedHeight;
      const latestBlockHeight =
        summary.latestBlocks.length > 0
          ? Number(summary.latestBlocks[0].height)
          : null;

      if (
        !options.skipLiveBlocks &&
        (indexedHeight === null ||
          tip.height > indexedHeight ||
          (latestBlockHeight !== null && tip.height > latestBlockHeight))
      ) {
        summary.latestBlocks = await liveChain.getRecentBlocks(
          chainId,
          5,
          options,
        );
      }
    } catch (err) {
      /* block list enrichment is best-effort */
    }
  }

  return summary;
}

async function getLandingData(options = {}) {
  const db = options.db || dbModule.openDatabase();
  const shared = Object.assign({}, options, { db, skipLiveBlocks: true });

  const [vrmRichlist, vrcRichlist, vrmLeaderboard, vrmSummary, vrcSummary] =
    await Promise.all([
      Promise.resolve(
        indexerQuery.getRichlist(
          "vrm",
          Object.assign({}, shared, { limit: 5 }),
        ),
      ),
      Promise.resolve(
        indexerQuery.getRichlist(
          "vrc",
          Object.assign({}, shared, { limit: 5 }),
        ),
      ),
      Promise.resolve(
        indexerQuery.getLeaderboard(
          "vrm",
          Object.assign({}, shared, {
            period: "month",
            sort: "activity",
            limit: 5,
          }),
        ),
      ),
      getChainSummary("vrm", shared),
      getChainSummary("vrc", shared),
    ]);

  return {
    vrmSummary,
    vrcSummary,
    vrmRichlist,
    vrcRichlist,
    vrmLeaderboard,
  };
}

async function getVrmDashboard(options = {}) {
  const db = options.db || dbModule.openDatabase();
  const shared = Object.assign({}, options, { db });
  const since30d = Math.floor(Date.now() / 1000) - 30 * 86_400;
  const richlist = indexerQuery.getRichlist(
    "vrm",
    Object.assign({}, shared, { limit: 5 }),
  );
  const leaderboard = indexerQuery.getLeaderboard(
    "vrm",
    Object.assign({}, shared, {
      period: "month",
      sort: "activity",
      limit: 5,
    }),
  );
  const activityHistory = indexerQuery.getChainActivityHistory(
    "vrm",
    Object.assign({}, shared, {
      since: since30d,
      maxPoints: 100,
    }),
  );
  const summary = await getChainSummary("vrm", shared);

  return { summary, richlist, leaderboard, activityHistory };
}

async function getIndexerHealth(options = {}) {
  const db = options.db || dbModule.openDatabase();
  const baseHealth = health.getIndexerHealth(
    Object.assign({}, options, { db }),
  );
  const chains = await Promise.all(
    baseHealth.chains.map(async (chainHealth) => {
      try {
        const tip = await liveChain.getTip(chainHealth.id, options);
        return health.enrichWithLiveRpc(chainHealth, tip.height, options);
      } catch (err) {
        return Object.assign({}, chainHealth, {
          explorerStatus: {
            label: "Offline",
            message: "Unable to reach the chain node.",
            syncing: false,
          },
        });
      }
    }),
  );

  return Object.assign({}, baseHealth, { chains });
}

async function getBlock(chainId, hashOrHeight, options = {}) {
  const indexed = indexerQuery.getBlock(chainId, hashOrHeight, options);

  if (indexed.found) {
    return indexed;
  }

  try {
    return await liveChain.getBlockFromRpc(chainId, hashOrHeight, options);
  } catch (err) {
    return indexed;
  }
}

module.exports = {
  getChainSummary,
  getIndexerHealth,
  getBlock,
  getLandingData,
  getVrmDashboard,
};
