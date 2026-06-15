import type { FastifyInstance } from 'fastify';
import { liveReadRateLimitRouteConfig } from '../env.js';
import { getBroker, getTip } from '../live/brokers.js';
import { initSse, writeSse } from '../live/sse.js';
import { releaseSseConnection, tryAcquireSseConnection } from '../security/sseConnections.js';
import type { TipState } from '../types.js';
import { parseChainId } from '../types.js';

export async function registerTipRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chain: string } }>(
    '/v1/:chain/tip',
    { ...liveReadRateLimitRouteConfig },
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) {
        return reply.code(400).send({ error: 'Invalid chain id' });
      }

      const tip = getTip(chainId);
      if (!tip) {
        return reply.code(503).send({ error: 'Tip unavailable' });
      }

      return tip;
    }
  );

  app.get<{ Params: { chain: string } }>(
    '/v1/:chain/tip/height',
    { ...liveReadRateLimitRouteConfig },
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) {
        return reply.code(400).send({ error: 'Invalid chain id' });
      }

      const tip = getTip(chainId);
      if (!tip) {
        return reply.code(503).send({ error: 'Tip unavailable' });
      }

      reply.header('content-type', 'text/plain; charset=utf-8');
      return String(tip.height);
    }
  );

  app.get<{ Params: { chain: string } }>(
    '/v1/:chain/tip/stream',
    { ...liveReadRateLimitRouteConfig },
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) {
        return reply.code(400).send({ error: 'Invalid chain id' });
      }

      if (!tryAcquireSseConnection(request, chainId)) {
        return reply.code(429).send({
          error: 'Too many requests',
          requestId: request.id,
        });
      }

      const broker = getBroker(chainId);
      // Hijack so Fastify does not send a second response after SSE headers.
      reply.hijack();
      initSse(reply.raw);

      const sendTip = (tip: TipState) => {
        if (reply.raw.writableEnded || reply.raw.destroyed) return;
        try {
          writeSse(reply.raw, { event: 'tip', data: JSON.stringify(tip) });
        } catch {
          /* client disconnected */
        }
      };

      const current = broker.getTip();
      if (current) {
        sendTip(current);
      }

      const onUpdate = (tip: TipState) => sendTip(tip);
      broker.on('tip', onUpdate);

      const heartbeat = setInterval(() => {
        if (reply.raw.writableEnded || reply.raw.destroyed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          reply.raw.write(': ping\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      await new Promise<void>((resolve) => {
        const cleanup = () => {
          broker.off('tip', onUpdate);
          clearInterval(heartbeat);
          releaseSseConnection(request, chainId);
          resolve();
        };
        request.raw.on('close', cleanup);
        request.raw.on('error', cleanup);
      });
    }
  );
}
