import { BcPanel } from '@/components/explorer/BlockchairUi';
import { RichlistBalanceList } from '@/components/explorer/home/RichlistBalanceList';
import { ChainPanelLink } from '@/components/explorer/chain/ChainPanelLink';
import type { RichlistResult } from '@/lib/api/types';
import { CHAIN_EXPLORERS, chainAddressPath, type ChainId } from '@/lib/chainDisplay';
import { formatExplorerUserMessage } from '@/lib/explorerCopy';
import { cn } from '@/lib/utils';

export function ChainRichlistPreview({
  chainId,
  richlist,
  totalSupply,
}: {
  chainId: ChainId;
  richlist: RichlistResult;
  totalSupply: number | null;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const richlistHref = config.richlistHref ?? `/${chainId}/richlist`;

  return (
    <BcPanel
      title="Rich list"
      flush
      className={cn(chainId === 'vrm' ? 'home-richlist-panel--vrm' : 'home-richlist-panel--vrc')}
      action={<ChainPanelLink href={richlistHref} label="View all" />}
    >
      {!richlist.enabled && richlist.message ? (
        <p className="px-5 py-4 text-sm text-fg-muted">
          {formatExplorerUserMessage(richlist.message)}
        </p>
      ) : richlist.items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-fg-muted">No ranked balances yet.</p>
      ) : (
        <RichlistBalanceList
          chainId={chainId}
          items={richlist.items}
          totalSupply={totalSupply}
          addressHref={(address) => chainAddressPath(chainId, address)}
        />
      )}
    </BcPanel>
  );
}
