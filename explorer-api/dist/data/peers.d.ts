import type { ChainId } from '../types.js';
export interface PeerEntry {
    id: number;
    address: string;
    ip: string;
    port: number | null;
    subversion: string;
    protocolVersion: number | null;
    inbound: boolean;
    connectedSeconds: number | null;
    lastSeen: string | null;
    pingMs: number | null;
}
export interface PeerVersionGroup {
    subversion: string;
    protocolVersion: number | null;
    count: number;
}
export interface PeersOverview {
    chainId: ChainId;
    fetchedAt: string;
    total: number;
    inbound: number;
    outbound: number;
    versions: PeerVersionGroup[];
    peers: PeerEntry[];
}
export declare function buildChainPeers(chainId: ChainId, limit: number): Promise<PeersOverview>;
