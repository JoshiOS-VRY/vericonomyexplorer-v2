export declare const repoRoot: string;
export declare function loadEnv(): void;
export declare function getPort(): number;
export declare function getTipPollMs(): number;
export declare function getLiveBlocksSkipGap(): number;
export declare function getSummaryLiveBlockLimit(): number;
export declare function getZmqUrl(chainId: string): string | undefined;
export declare function getHost(): string;
export declare function isRateLimitEnabled(): boolean;
export declare function getRateLimitWindowMs(): number;
export declare function getRateLimitMax(): number;
export declare function getRateLimitCrawlerMax(): number;
export declare function getRateLimitHeavyMax(): number;
export declare function getRateLimitSseMax(): number;
export declare function getRateLimitAllowIps(): string[];
export declare function getRedisUrl(): string | undefined;
/** Route config for expensive read endpoints (1 minute window). */
export declare const heavyRateLimitRouteConfig: {
    readonly config: {
        readonly rateLimit: {
            readonly max: number;
            readonly timeWindow: 60000;
        };
    };
};
/** Disable rate limiting on health probes. */
export declare const healthRateLimitRouteConfig: {
    readonly config: {
        readonly rateLimit: false;
    };
};
