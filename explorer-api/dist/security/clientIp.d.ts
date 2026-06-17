import type { FastifyRequest } from 'fastify';
export declare function isAllowlistedIp(ip: string): boolean;
export declare function getClientIp(request: FastifyRequest): string;
export declare function isRateLimitAllowlisted(request: FastifyRequest): boolean;
