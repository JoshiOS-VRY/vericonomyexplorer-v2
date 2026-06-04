import { EventEmitter } from "node:events";
import { getSyncTipHeight } from "../data/db.js";
import type { RpcClient } from "../rpc/pool.js";
import type { ChainId, TipState } from "../types.js";

function noop(): void {
  /* ignore */
}

function blockTimeFromRpc(block: { time?: number } | null | undefined): number {
  const time = Number(block?.time);
  return Number.isFinite(time) && time > 0 ? time : Date.now();
}

export class TipBroker extends EventEmitter {
  current: TipState | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private zmqAbort: AbortController | null = null;
  private polling = false;

  constructor(
    readonly chainId: ChainId,
    private readonly rpc: RpcClient,
    private readonly pollMs: number,
    private readonly zmqUrl?: string,
  ) {
    super();
    this.setMaxListeners(100);
  }

  async start(): Promise<void> {
    await this.seedFromDb();
    await this.poll().catch(noop);
    this.pollTimer = setInterval(() => {
      void this.poll().catch(noop);
    }, this.pollMs);

    if (this.zmqUrl) {
      void this.startZmq(this.zmqUrl);
    }
  }

  getTip(): TipState | null {
    return this.current;
  }

  async stop(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.zmqAbort?.abort();
    this.zmqAbort = null;
  }

  private async seedFromDb(): Promise<void> {
    const height = getSyncTipHeight(this.chainId);
    if (height == null || height < 0) return;
    try {
      const hash = await this.rpc.call<string>("getblockhash", [height]);
      const time = await this.resolveBlockTime(hash);
      this.current = { height: Number(height), hash, time };
    } catch {
      this.current = { height: Number(height), hash: "", time: Date.now() };
    }
  }

  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const height = Number(await this.rpc.call<number>("getblockcount"));
      if (this.current?.height === height) return;
      const hash = await this.rpc.call<string>("getblockhash", [height]);
      const time = await this.resolveBlockTime(hash);
      this.setTip({ height, hash, time });
    } catch {
      /* keep last known tip */
    } finally {
      this.polling = false;
    }
  }

  private async resolveBlockTime(hash: string): Promise<number> {
    try {
      const block = await this.rpc.call<{ time?: number }>("getblock", [hash, 1]);
      return blockTimeFromRpc(block);
    } catch {
      return Date.now();
    }
  }

  private setTip(tip: TipState): void {
    this.current = tip;
    this.emit("tip", tip);
  }

  private async startZmq(url: string): Promise<void> {
    this.zmqAbort = new AbortController();
    const { Subscriber } = await import("zeromq");
    const sock = new Subscriber();
    try {
      sock.connect(url);
      sock.subscribe("hashblock");
      for await (const [, message] of sock) {
        if (this.zmqAbort.signal.aborted) break;
        const hash = message.toString("hex");
        try {
          const block = await this.rpc.call<{ height: number; time?: number }>(
            "getblock",
            [hash, 1],
          );
          const height = Number(block.height);
          if (this.current?.height === height) continue;
          this.setTip({ height, hash, time: blockTimeFromRpc(block) });
        } catch {
          void this.poll().catch(noop);
        }
      }
    } catch {
      /* ZMQ unavailable — poll fallback remains active */
    } finally {
      sock.close();
    }
  }
}
