'use client';

import Link from 'next/link';
import { VrmAddressLabel } from '@/components/explorer/address/VrmAddressLink';
import type { RichlistItem, RichlistResult } from '@/lib/api/types';
import { CHAIN_EXPLORERS, CHAIN_THEME, chainAddressPath, type ChainId } from '@/lib/chainDisplay';
import { formatExplorerUserMessage } from '@/lib/explorerCopy';
import { formatSupplySharePct, supplySharePercent } from '@/lib/formatMarket';
import { cn, ellipsizeMiddle, formatCompactBalance } from '@/lib/utils';

interface HomeHolderBoardProps {
  richlist: RichlistResult;
  totalSupply: number | null;
}

function listedShare(items: RichlistItem[], totalSupply: number | null): number | null {
  if (totalSupply == null || totalSupply <= 0) return null;
  let sum = 0;
  for (const item of items) {
    const amount = Number.parseFloat(item.balance.amount);
    const pct = supplySharePercent(amount, totalSupply);
    if (pct != null) sum += pct;
  }
  return sum > 0 ? sum : null;
}

export function HomeHolderBoard({ richlist, totalSupply }: HomeHolderBoardProps) {
  const chainId = richlist.chainId as ChainId;
  const config = CHAIN_EXPLORERS[chainId];
  const theme = CHAIN_THEME[chainId];
  const shareTotal = listedShare(richlist.items, totalSupply);
  const ticker = richlist.items[0]?.balance.ticker ?? config.ticker;

  if (!config) return null;

  return (
    <section
      className={cn('chain-hub-section chain-hub-section--accent home-holders-panel')}
      data-chain={chainId}
      style={
        {
          '--block-chain-accent': theme.accent,
          '--block-chain-accent-soft': theme.accentSoft,
          '--holders-accent': theme.accent,
          '--holders-accent-soft': theme.accentSoft,
        } as React.CSSProperties
      }
    >
      <header className="home-holders-panel__head">
        <div>
          <h2 className="home-holders-panel__title">{config.name}</h2>
          <p className="home-holders-panel__subtitle">Top holders by supply share</p>
        </div>
        {config.richlistHref && richlist.enabled !== false ? (
          <Link href={config.richlistHref} prefetch className="home-holders-panel__link">
            Full rich list
          </Link>
        ) : null}
      </header>

      <div className="home-holders-panel__body">
        {!richlist.enabled && richlist.message ? (
          <p className="home-holders-panel__empty">{formatExplorerUserMessage(richlist.message)}</p>
        ) : richlist.items.length === 0 ? (
          <p className="home-holders-panel__empty">No ranked balances yet.</p>
        ) : (
          <ol className="home-holders-panel__list">
            {richlist.items.map((item) => {
              const amount = Number.parseFloat(item.balance.amount);
              const sharePct = supplySharePercent(amount, totalSupply);
              const shareLabel = formatSupplySharePct(amount, totalSupply);
              const href = config.exploreHref ? chainAddressPath(chainId, item.address) : '#';
              const barWidth = sharePct != null ? Math.min(100, Math.max(sharePct * 4, 4)) : 0;

              return (
                <li key={item.address}>
                  <Link href={href} prefetch={false} className="home-holders-panel__row">
                    <span className="home-holders-panel__rank">{item.rank}</span>
                    <div className="home-holders-panel__main">
                      <div className="home-holders-panel__row-head">
                        <span className="home-holders-panel__addr" title={item.address}>
                          {chainId === 'vrm' ? (
                            <VrmAddressLabel address={item.address} maxLength={22} />
                          ) : (
                            ellipsizeMiddle(item.address, 22)
                          )}
                        </span>
                        <span
                          className="home-holders-panel__balance"
                          title={`${item.balance.amount} ${ticker}`}
                        >
                          {formatCompactBalance(item.balance.amount)}
                          <span className="home-holders-panel__ticker">{ticker}</span>
                        </span>
                      </div>
                      <div className="home-holders-panel__bar-track" aria-hidden>
                        <span
                          className="home-holders-panel__bar-fill"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      {shareLabel ? (
                        <span className="home-holders-panel__share">{shareLabel} of supply</span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {shareTotal != null && richlist.items.length > 0 ? (
        <footer className="home-holders-panel__foot">
          Top {richlist.items.length} hold{' '}
          <strong>{shareTotal >= 10 ? shareTotal.toFixed(1) : shareTotal.toFixed(2)}%</strong> of{' '}
          {ticker}
        </footer>
      ) : null}
    </section>
  );
}
