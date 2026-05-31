import type { FastifyInstance } from "fastify";
import { registerAddressRoutes } from "./address.js";
import { registerBlockRoutes } from "./block.js";
import { registerChainRoutes } from "./chain.js";
import { registerHomeRoutes } from "./home.js";
import { registerInsightsRoutes } from "./insights.js";
import { registerPeersRoutes } from "./peers.js";
import { registerRichRoutes } from "./rich.js";
import { registerSearchRoutes } from "./search.js";
import { registerTipRoutes } from "./tip.js";
import { registerTxRoutes } from "./tx.js";
import { registerWalletRoutes } from "./wallet.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await registerTipRoutes(app);
  await registerHomeRoutes(app);
  await registerChainRoutes(app);
  await registerInsightsRoutes(app);
  await registerBlockRoutes(app);
  await registerTxRoutes(app);
  await registerAddressRoutes(app);
  await registerRichRoutes(app);
  await registerSearchRoutes(app);
  await registerPeersRoutes(app);
  await registerWalletRoutes(app);
}
