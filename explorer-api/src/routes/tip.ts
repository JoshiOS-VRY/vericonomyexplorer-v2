import type { FastifyInstance } from "fastify";
import { getBroker, getTip } from "../live/brokers.js";
import { initSse, writeSse } from "../live/sse.js";
import type { TipState } from "../types.js";
import { parseChainId } from "../types.js";

export async function registerTipRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chain: string } }>("/v1/:chain/tip", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const tip = getTip(chainId);
    if (!tip) {
      return reply.code(503).send({ error: "Tip unavailable" });
    }

    return tip;
  });

  app.get<{ Params: { chain: string } }>("/v1/:chain/tip/height", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const tip = getTip(chainId);
    if (!tip) {
      return reply.code(503).send({ error: "Tip unavailable" });
    }

    reply.header("content-type", "text/plain; charset=utf-8");
    return String(tip.height);
  });

  app.get<{ Params: { chain: string } }>("/v1/:chain/tip/stream", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const broker = getBroker(chainId);
    initSse(reply.raw);

    const sendTip = (tip: TipState) => {
      writeSse(reply.raw, { event: "tip", data: JSON.stringify(tip) });
    };

    const current = broker.getTip();
    if (current) {
      sendTip(current);
    }

    const onUpdate = (tip: TipState) => sendTip(tip);
    broker.on("tip", onUpdate);

    const heartbeat = setInterval(() => {
      reply.raw.write(": ping\n\n");
    }, 15_000);

    await new Promise<void>((resolve) => {
      request.raw.on("close", () => {
        broker.off("tip", onUpdate);
        clearInterval(heartbeat);
        resolve();
      });
    });
  });
}
