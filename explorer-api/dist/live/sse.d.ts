import type { ServerResponse } from "node:http";
export interface SsePayload {
    event?: string;
    data: string;
    id?: string;
}
export declare function writeSse(res: ServerResponse, payload: SsePayload): void;
export declare function initSse(res: ServerResponse): void;
