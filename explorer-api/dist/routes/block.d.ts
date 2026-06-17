import type { FastifyInstance } from 'fastify';
export declare const blockCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
export declare function registerBlockRoutes(app: FastifyInstance): Promise<void>;
