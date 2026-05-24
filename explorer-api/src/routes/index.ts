import type { FastifyInstance } from "fastify";
import { registerAddressRoutes } from "./address.js";
import { registerBlockRoutes } from "./block.js";
import { registerChainRoutes } from "./chain.js";
import { registerRichRoutes } from "./rich.js";
import { registerSearchRoutes } from "./search.js";
import { registerTipRoutes } from "./tip.js";
import { registerTxRoutes } from "./tx.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await registerTipRoutes(app);
  await registerChainRoutes(app);
  await registerBlockRoutes(app);
  await registerTxRoutes(app);
  await registerAddressRoutes(app);
  await registerRichRoutes(app);
  await registerSearchRoutes(app);
}
