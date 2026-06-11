import { AlertBanner, formatHeight } from '@/components/explorer/ExplorerUi';
import { BcPageHeader, BcPanel, BcStat, BcStatGrid } from '@/components/explorer/BlockchairUi';
import { getPeers } from '@/lib/api/indexer';
import { formatBlockAge } from '@/lib/utils';

function formatConnected(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function isoToUnix(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export async function PeersPageView({ chainId, coinName }: { chainId: string; coinName: string }) {
  let peers;
  try {
    peers = await getPeers(chainId, { limit: 300 });
  } catch {
    return (
      <div className="space-y-6">
        <BcPageHeader title="Peers" subtitle={`Nodes connected to the ${coinName} explorer.`} />
        <AlertBanner title="Peers Unavailable">
          Unable to load peer information from the {coinName} node right now.
        </AlertBanner>
      </div>
    );
  }

  if (peers.total === 0) {
    return (
      <div className="space-y-6">
        <BcPageHeader title="Peers" subtitle={`Nodes connected to the ${coinName} explorer.`} />
        <AlertBanner title="No peers connected">
          The {coinName} explorer node is not currently reporting any connected peers.
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BcPageHeader
        title="Peers"
        subtitle={`Nodes connected to the ${coinName} explorer wallet right now.`}
      />

      <BcStatGrid>
        <BcStat label="Connected peers" value={formatHeight(peers.total)} />
        <BcStat label="Outbound" value={formatHeight(peers.outbound)} />
        <BcStat label="Inbound" value={formatHeight(peers.inbound)} />
      </BcStatGrid>

      <BcPanel title="Peers by client version" flush>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Sub. version</th>
                <th>Protocol</th>
                <th className="text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {peers.versions.map((group) => (
                <tr key={`${group.subversion}-${group.protocolVersion}`}>
                  <td className="font-mono text-[13px]">{group.subversion || '—'}</td>
                  <td className="tabular-nums text-fg-muted">{group.protocolVersion ?? '—'}</td>
                  <td className="text-right font-medium tabular-nums">
                    {formatHeight(group.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BcPanel>

      <BcPanel title="Connected peers" flush>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th>Sub. version</th>
                <th>Protocol</th>
                <th>Direction</th>
                <th className="text-right">Connected</th>
                <th className="text-right">Ping</th>
                <th className="text-right">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {peers.peers.map((peer, index) => (
                <tr key={`${peer.id}-${peer.address}`}>
                  <td className="tabular-nums text-fg-subtle">{index + 1}</td>
                  <td className="font-mono text-[13px]">{peer.address}</td>
                  <td className="font-mono text-[13px] text-fg-muted">{peer.subversion || '—'}</td>
                  <td className="tabular-nums text-fg-muted">{peer.protocolVersion ?? '—'}</td>
                  <td className="text-fg-muted">{peer.inbound ? 'Inbound' : 'Outbound'}</td>
                  <td className="text-right tabular-nums text-fg-muted">
                    {formatConnected(peer.connectedSeconds)}
                  </td>
                  <td className="text-right tabular-nums text-fg-muted">
                    {peer.pingMs != null ? `${peer.pingMs} ms` : '—'}
                  </td>
                  <td className="text-right tabular-nums text-fg-muted">
                    {formatBlockAge(isoToUnix(peer.lastSeen))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BcPanel>
    </div>
  );
}
