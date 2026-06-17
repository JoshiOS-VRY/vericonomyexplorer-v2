import type { HomeMarketPayload, HomeNetworkPayload, HomePayload, HomeShellPayload } from '../types/home.js';
export declare function fetchHomeShell(): Promise<HomeShellPayload>;
export declare function fetchHomeNetworkLite(): Promise<HomeNetworkPayload>;
export declare function fetchHomeNetwork(): Promise<HomeNetworkPayload>;
export declare function fetchHomeData(): Promise<HomePayload>;
export declare function fetchHomeMarketOnly(): Promise<HomeMarketPayload>;
