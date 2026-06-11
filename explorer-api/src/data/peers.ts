// Public peers overview for the explorer web UI.
//
// Mirrors the legacy explorer "Peers" page (https://explorer-vrm.vericonomy.com/#homePeers):
// a list of nodes the explorer wallet is connected to, plus a grouped summary
// by client subversion / protocol version. Sourced live from the node's
// `getpeerinfo` RPC.

import { rpc } from '../rpc/index.js';
import type { ChainId } from '../types.js';

const RPC_TIMEOUT_MS = 8_000;

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function splitHostPort(addr: string): { ip: string; port: number | null } {
  // IPv6 form: [::1]:1234
  const bracket = addr.match(/^\[(.+)\]:(\d+)$/);
  if (bracket) return { ip: bracket[1], port: Number(bracket[2]) };
  const lastColon = addr.lastIndexOf(':');
  if (lastColon > -1 && addr.indexOf(':') === lastColon) {
    return { ip: addr.slice(0, lastColon), port: Number(addr.slice(lastColon + 1)) };
  }
  return { ip: addr, port: null };
}

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

export async function buildChainPeers(chainId: ChainId, limit: number): Promise<PeersOverview> {
  const rawPeers = await rpc(chainId)
    .call<unknown[]>('getpeerinfo', [], RPC_TIMEOUT_MS)
    .catch(() => null);

  const peers: PeerEntry[] = [];
  if (Array.isArray(rawPeers)) {
    for (const raw of rawPeers) {
      if (raw == null || typeof raw !== 'object') continue;
      const peer = raw as Record<string, unknown>;
      const addr = typeof peer.addr === 'string' ? peer.addr : null;
      if (addr == null) continue;
      const { ip, port } = splitHostPort(addr);
      const conntime = toNumberOrNull(peer.conntime);
      const pingSeconds = toNumberOrNull(peer.pingtime);
      peers.push({
        id: toNumberOrNull(peer.id) ?? peers.length,
        address: addr,
        ip,
        port,
        subversion: typeof peer.subver === 'string' ? peer.subver : '',
        protocolVersion: toNumberOrNull(peer.version),
        inbound: peer.inbound === true,
        connectedSeconds:
          conntime != null ? Math.max(0, Math.floor(Date.now() / 1000) - conntime) : null,
        lastSeen:
          toNumberOrNull(peer.lastrecv) != null
            ? new Date((toNumberOrNull(peer.lastrecv) as number) * 1000).toISOString()
            : null,
        pingMs: pingSeconds != null ? Math.round(pingSeconds * 1000) : null,
      });
    }
  }

  const groups = new Map<string, PeerVersionGroup>();
  for (const peer of peers) {
    const key = `${peer.subversion}|${peer.protocolVersion ?? ''}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        subversion: peer.subversion,
        protocolVersion: peer.protocolVersion,
        count: 1,
      });
    }
  }

  const versions = [...groups.values()].sort((a, b) => b.count - a.count);
  const inbound = peers.filter((p) => p.inbound).length;

  return {
    chainId,
    fetchedAt: new Date().toISOString(),
    total: peers.length,
    inbound,
    outbound: peers.length - inbound,
    versions,
    peers: peers.slice(0, limit),
  };
}
