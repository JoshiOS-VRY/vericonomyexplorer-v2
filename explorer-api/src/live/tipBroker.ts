import { EventEmitter } from "node:events";
import { Subscriber } from "zeromq";
import { getSyncTipHeight } from "../data/db.js";
import type { RpcClient } from "../rpc/pool.js";
import type { ChainId, TipState } from "../types.js";

function noop(): void {
  /* ignore */
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
      this.current = { height, hash, time: Date.now() };
    } catch {
      this.current = { height, hash: "", time: Date.now() };
    }
  }

  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const height = Number(await this.rpc.call<number>("getblockcount"));
      if (this.current?.height === height) return;
      const hash = await this.rpc.call<string>("getblockhash", [height]);
      this.setTip({ height, hash, time: Date.now() });
    } catch {
      /* keep last known tip */
    } finally {
      this.polling = false;
    }
  }

  private setTip(tip: TipState): void {
    this.current = tip;
    this.emit("tip", tip);
  }

  private async startZmq(url: string): Promise<void> {
    this.zmqAbort = new AbortController();
    const sock = new Subscriber();
    try {
      sock.connect(url);
      sock.subscribe("hashblock");
      for await (const [, message] of sock) {
        if (this.zmqAbort.signal.aborted) break;
        const hash = message.toString("hex");
        try {
          const block = await this.rpc.call<{ height: number; time: number }>("getblock", [
            hash,
            1,
          ]);
          const height = Number(block.height);
          if (this.current?.height === height) continue;
          this.setTip({ height, hash, time: Date.now() });
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
