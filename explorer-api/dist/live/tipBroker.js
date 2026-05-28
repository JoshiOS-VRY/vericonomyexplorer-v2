import { EventEmitter } from "node:events";
import { getSyncTipHeight } from "../data/db.js";
function noop() {
    /* ignore */
}
export class TipBroker extends EventEmitter {
    chainId;
    rpc;
    pollMs;
    zmqUrl;
    current = null;
    pollTimer = null;
    zmqAbort = null;
    polling = false;
    constructor(chainId, rpc, pollMs, zmqUrl) {
        super();
        this.chainId = chainId;
        this.rpc = rpc;
        this.pollMs = pollMs;
        this.zmqUrl = zmqUrl;
        this.setMaxListeners(100);
    }
    async start() {
        await this.seedFromDb();
        await this.poll().catch(noop);
        this.pollTimer = setInterval(() => {
            void this.poll().catch(noop);
        }, this.pollMs);
        if (this.zmqUrl) {
            void this.startZmq(this.zmqUrl);
        }
    }
    getTip() {
        return this.current;
    }
    async stop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.zmqAbort?.abort();
        this.zmqAbort = null;
    }
    async seedFromDb() {
        const height = getSyncTipHeight(this.chainId);
        if (height == null || height < 0)
            return;
        try {
            const hash = await this.rpc.call("getblockhash", [height]);
            this.current = { height: Number(height), hash, time: Date.now() };
        }
        catch {
            this.current = { height: Number(height), hash: "", time: Date.now() };
        }
    }
    async poll() {
        if (this.polling)
            return;
        this.polling = true;
        try {
            const height = Number(await this.rpc.call("getblockcount"));
            if (this.current?.height === height)
                return;
            const hash = await this.rpc.call("getblockhash", [height]);
            this.setTip({ height, hash, time: Date.now() });
        }
        catch {
            /* keep last known tip */
        }
        finally {
            this.polling = false;
        }
    }
    setTip(tip) {
        this.current = tip;
        this.emit("tip", tip);
    }
    async startZmq(url) {
        this.zmqAbort = new AbortController();
        const { Subscriber } = await import("zeromq");
        const sock = new Subscriber();
        try {
            sock.connect(url);
            sock.subscribe("hashblock");
            for await (const [, message] of sock) {
                if (this.zmqAbort.signal.aborted)
                    break;
                const hash = message.toString("hex");
                try {
                    const block = await this.rpc.call("getblock", [
                        hash,
                        1,
                    ]);
                    const height = Number(block.height);
                    if (this.current?.height === height)
                        continue;
                    this.setTip({ height, hash, time: Date.now() });
                }
                catch {
                    void this.poll().catch(noop);
                }
            }
        }
        catch {
            /* ZMQ unavailable — poll fallback remains active */
        }
        finally {
            sock.close();
        }
    }
}
