import type { FastifyInstance } from "fastify";
import type { VrmNetworkHashratePayload } from "../types/home.js";
declare function fetchVrmNetworkHashratePayload(): Promise<VrmNetworkHashratePayload>;
declare const vrmHashrateCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
export declare function registerVrmNetworkRoutes(app: FastifyInstance): Promise<void>;
export { vrmHashrateCache, fetchVrmNetworkHashratePayload };
