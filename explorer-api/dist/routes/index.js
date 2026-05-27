import { registerAddressRoutes } from "./address.js";
import { registerBlockRoutes } from "./block.js";
import { registerChainRoutes } from "./chain.js";
import { registerHomeRoutes } from "./home.js";
import { registerRichRoutes } from "./rich.js";
import { registerSearchRoutes } from "./search.js";
import { registerTipRoutes } from "./tip.js";
import { registerTxRoutes } from "./tx.js";
export async function registerRoutes(app) {
    await registerTipRoutes(app);
    await registerHomeRoutes(app);
    await registerChainRoutes(app);
    await registerBlockRoutes(app);
    await registerTxRoutes(app);
    await registerAddressRoutes(app);
    await registerRichRoutes(app);
    await registerSearchRoutes(app);
}
