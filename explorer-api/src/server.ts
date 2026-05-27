import { getHost, getPort, loadEnv } from "./env.js";

loadEnv();

const { default: cors } = await import("@fastify/cors");
const { default: Fastify } = await import("fastify");
const { applyCacheHeaders } = await import("./cache/httpCache.js");
const { closeDb } = await import("./data/db.js");
const { queryPool } = await import("./db/queryPool.js");
const { initBrokers, stopBrokers } = await import("./live/brokers.js");
const { closeAllRpcClients } = await import("./rpc/index.js");
const { registerCacheInvalidation } = await import("./routes/chain.js");
const { registerHomeCacheInvalidation } = await import("./routes/home.js");
const { registerRoutes } = await import("./routes/index.js");

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
