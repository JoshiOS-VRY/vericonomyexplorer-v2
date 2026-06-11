import type { FastifyRequest } from "fastify";
export declare function tryAcquireSseConnection(request: FastifyRequest, chainId: string): boolean;
export declare function releaseSseConnection(request: FastifyRequest, chainId: string): void;
