import { randomUUID } from 'node:crypto';
import { getHost, getPort, loadEnv } from './env.js';
import { mapErrorToResponse } from './errors.js';
import { jsonReplacer } from './util/json.js';

loadEnv();

const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
require('../../app/indexerV2/miningPoolConfigs.js').loadAllMiningPoolConfigs();

const { default: cors } = await import('@fastify/cors');
const { default: Fastify } = await import('fastify');
const { applyCacheHeaders } = await import('./cache/httpCache.js');
const { closeDb } = await import('./data/db.js');
const { queryPool, runIndexerQuery } = await import('./db/queryPool.js');
const { initBrokers, stopBrokers } = await import('./live/brokers.js');
const { closeAllRpcClients } = await import('./rpc/index.js');
const { registerCacheInvalidation } = await import('./routes/chain.js');
const { registerHomeCacheInvalidation } = await import('./routes/home.js');
const { registerRoutes } = await import('./routes/index.js');

const app = Fastify({
  logger: {
    level: process.env.VCEXP_FAST_API_LOG_LEVEL ?? 'info',
  },
  genReqId: () => randomUUID(),
  trustProxy: true,
});

const { registerSecurity } = await import('./security/rateLimit.js');
await registerSecurity(app);

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.addHook('onSend', async (request, reply) => {
  applyCacheHeaders(request, reply);
});

// Serialize JSON responses in a single pass with a BigInt-aware replacer.
// (Previously a preSerialization hook did JSON.parse(JSON.stringify(...)) and
// then Fastify serialized again — three passes per response; this does one.)
app.setReplySerializer((payload) => JSON.stringify(payload, jsonReplacer));

app.setErrorHandler((error, request, reply) => {
  const mapped = mapErrorToResponse(error);
  request.log.error({ err: error, requestId: request.id }, mapped.error);
  reply.code(mapped.statusCode).send({
    error: mapped.error,
    requestId: request.id,
  });
});

app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    error: 'Not found',
    requestId: request.id,
  });
});

await registerRoutes(app);

await initBrokers();
registerCacheInvalidation();
registerHomeCacheInvalidation();
const { registerNetworkMetricSnapshots } = await import('./live/networkMetrics.js');
registerNetworkMetricSnapshots();

const host = getHost();
const port = getPort();

await app.listen({ host, port });

app.log.info(`explorer-api listening on http://${host}:${port}`);

void (async () => {
  const { fetchLandingData } = await import('./data/legacy.js');
  const { withTimeout } = await import('./util/timeout.js');
  const warmupTimeoutMs = Number(process.env.VCEXP_API_WARMUP_TIMEOUT_MS ?? 8_000);

  await Promise.all([
    withTimeout(
      runIndexerQuery('getChainHealth', ['vrm'], {}, { coalesce: false, timeoutMs: 5_000 }),
      warmupTimeoutMs,
      'warmup-chain-health'
    ).catch(() => null),
    withTimeout(fetchLandingData(), warmupTimeoutMs, 'warmup-landing').catch(() => null),
  ]);
  app.log.info('query worker pool and read caches warmed');
})().catch((error: unknown) => {
  app.log.warn({ err: error }, 'query worker warmup failed');
});

async function shutdown(): Promise<void> {
  app.log.info('shutting down explorer-api');
  await stopBrokers();
  await closeAllRpcClients();
  await queryPool.terminate();
  closeDb();
  await app.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
