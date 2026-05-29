import type { FastifyRequest } from "fastify";
export declare function tryAcquireSseConnection(request: FastifyRequest): boolean;
export declare function releaseSseConnection(request: FastifyRequest): void;
