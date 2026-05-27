import cors from "@fastify/cors";
import Fastify from "fastify";
import { applyCacheHeaders } from "./cache/httpCache.js";
import { closeDb } from "./data/db.js";
import { queryPool } from "./db/queryPool.js";
import { getHost, getPort, loadEnv } from "./env.js";
import { initBrokers, stopBrokers } from "./live/brokers.js";
import { closeAllRpcClients } from "./rpc/index.js";
import { registerCacheInvalidation } from "./routes/chain.js";
import { registerHomeCacheInvalidation } from "./routes/home.js";
import { registerRoutes } from "./routes/index.js";

loadEnv();

const app = Fastify({
  logger: {
    level: process.env.VCEXP_FAST_API_LOG_LEVEL ?? "info",
  },
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.addHook("onSend", async (request, reply) => {
  applyCacheHeaders(request, reply);
});

await registerRoutes(app);

await initBrokers();
registerCacheInvalidation();
registerHomeCacheInvalidation();

const host = getHost();
const port = getPort();

await app.listen({ host, port });

app.log.info(`explorer-api listening on http://${host}:${port}`);

async function shutdown(): Promise<void> {
  app.log.info("shutting down explorer-api");
  await stopBrokers();
  await closeAllRpcClients();
  await queryPool.terminate();
  closeDb();
  await app.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
