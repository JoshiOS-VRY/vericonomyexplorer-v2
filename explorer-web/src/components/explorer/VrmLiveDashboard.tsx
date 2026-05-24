"use client";

import Link from "next/link";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import {
  BcHashLink,
  BcPageHeader,
  BcPanel,
  BcStat,
  BcStatGrid,
  BcTableLink,
} from "@/components/explorer/BlockchairUi";
import { RankList, TxTypeBadge, formatHeight } from "@/components/explorer/ExplorerUi";
import { useLiveChainSummary } from "@/hooks/useLiveChainSummary";
import type {
  ChainSummary,
  IndexedBlock,
  IndexedTransaction,
  LeaderboardResult,
  RichlistResult,
} from "@/lib/api/types";
import { cn, ellipsizeMiddle, formatDifficulty } from "@/lib/utils";

interface VrmLiveDashboardProps {
  initialSummary: ChainSummary;
  initialRichlist: RichlistResult;
  initialLeaderboard: LeaderboardResult;
}

export function VrmLiveDashboard({
  initialSummary,
  initialRichlist,
  initialLeaderboard,
}: VrmLiveDashboardProps) {
  const live = useLiveChainSummary("vrm", initialSummary);
  const {
    summary,
    chainHeight,
    addressCount,
    latestBlocks,
    newBlockHashes,
    toastBlock,
    heightPulse,
  } = live;

  const tipBlock = latestBlocks[0];
  const tipDifficulty = tipBlock?.difficulty;

  return (
    <div>
      {toastBlock ? <NewBlockToast block={toastBlock} /> : null}

      <BcPageHeader
        title="Verium"
        subtitle="Explore blocks, transactions, and addresses on the Verium blockchain."
        badge={
          <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">
            VRM
          </span>
        }
      />

      <BcStatGrid>
        <BcStat label="Block height" value={formatHeight(chainHeight)} pulse={heightPulse} />
        <BcStat label="Addresses" value={formatHeight(addressCount)} />
        <BcStat
          label="Latest block"
          value={
            tipBlock ? (
              <LiveRelativeTime time={tipBlock.time} interval="second" className="text-xl font-bold sm:text-2xl" />
            ) : (
              "—"
            )
          }
        />
        <BcStat
          label="Difficulty"
          value={tipDifficulty ? formatDifficulty(tipDifficulty) : "—"}
        />
      </BcStatGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <BcPanel title="Blocks" flush action={<ViewAllLink href="/vrm" label="Refresh live" />}>
          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Height</th>
                  <th className="bc-col-age">Time</th>
                  <th className="text-right">Txs</th>
                  <th className="text-right">Out</th>
                  <th className="text-right">Size</th>
                  <th className="text-right">Difficulty</th>
                  <th>Extracted by</th>
                </tr>
              </thead>
              <tbody>
                {latestBlocks.map((block) => (
                  <LiveBlockTableRow
                    key={block.hash}
                    block={block}
                    isNew={newBlockHashes.has(block.hash)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </BcPanel>

        <div className="flex flex-col gap-6">
          <BcPanel title="Rich list" action={<ViewAllLink href="/vrm/richlist" label="View all" />}>
            {!initialRichlist.enabled && initialRichlist.message ? (
              <p className="text-sm text-fg-muted">{initialRichlist.message}</p>
            ) : (
              <RankList
                items={initialRichlist.items.map((item) => ({
                  href: `/vrm/address/${item.address}`,
                  rank: item.rank,
                  label: ellipsizeMiddle(item.address, 18),
                  value: `${item.balance.amount} ${item.balance.ticker}`,
                }))}
              />
            )}
          </BcPanel>

          <BcPanel
            title="Activity"
            action={<ViewAllLink href="/vrm/leaderboard?period=month&sort=activity" label="Leaderboard" />}
          >
            {!initialLeaderboard.enabled && initialLeaderboard.message ? (
              <p className="text-sm text-fg-muted">{initialLeaderboard.message}</p>
            ) : (
              <RankList
                items={initialLeaderboard.items.map((item) => ({
                  href: `/vrm/address/${item.address}`,
                  rank: item.rank,
                  label: ellipsizeMiddle(item.address, 18),
                  value: `${formatHeight(item.txCount)} tx`,
                }))}
              />
            )}
          </BcPanel>
        </div>
      </div>

      <div className="mt-6">
        <BcPanel title="Transactions" flush>
          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Block</th>
                  <th>Type</th>
                  <th className="bc-col-age">Age</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentTransactions.map((tx) => (
                  <LiveTransactionTableRow key={tx.txid} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>
        </BcPanel>
      </div>
    </div>
  );
}

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-xs font-semibold text-accent hover:underline">
      {label}
    </Link>
  );
}

function LiveBlockTableRow({
  block,
  isNew,
}: {
  block: IndexedBlock;
  isNew: boolean;
}) {
  return (
    <tr className={cn(isNew && "live-block-new")}>
      <td>
        <BcTableLink href={`/vrm/block/${block.height}`} className="tabular-nums">
          {formatHeight(block.height)}
        </BcTableLink>
      </td>
      <td className="bc-col-age text-fg-muted">
        <LiveRelativeTime time={block.time} interval="second" fixedWidth />
      </td>
      <td className="text-right tabular-nums text-fg-muted">{formatHeight(block.txCount)}</td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.outputCount != null ? formatHeight(block.outputCount) : "—"}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.size != null ? formatHeight(block.size) : "—"}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.difficulty ? formatDifficulty(block.difficulty) : "—"}
      </td>
      <td className="min-w-[8rem] max-w-[14rem] truncate">
        <ExtractedByCell block={block} />
      </td>
    </tr>
  );
}

function ExtractedByCell({ block }: { block: IndexedBlock }) {
  if (block.extractedByAddress) {
    return (
      <BcTableLink href={`/vrm/address/${block.extractedByAddress}`} title={block.extractedByAddress}>
        {ellipsizeMiddle(block.extractedByAddress, 16)}
      </BcTableLink>
    );
  }

  if (block.extractedBy) {
    return (
      <span className="text-sm font-medium text-fg" title={block.extractedBy}>
        {block.extractedBy}
      </span>
    );
  }

  return <span className="text-sm text-fg-muted">Unknown</span>;
}

function LiveTransactionTableRow({ tx }: { tx: IndexedTransaction }) {
  return (
    <tr>
      <td className="max-w-[10rem] truncate sm:max-w-lg">
        <BcHashLink href={`/vrm/tx/${tx.txid}`} value={ellipsizeMiddle(tx.txid, 32)} />
      </td>
      <td>
        <BcTableLink href={`/vrm/block/${tx.blockHeight}`} className="tabular-nums text-sm">
          {formatHeight(tx.blockHeight)}
        </BcTableLink>
      </td>
      <td>
        <TxTypeBadge isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} />
      </td>
      <td className="bc-col-age text-fg-muted">
        <LiveRelativeTime time={tx.time} interval="minute" fixedWidth />
      </td>
    </tr>
  );
}

function NewBlockToast({ block }: { block: IndexedBlock }) {
  return (
    <div className="live-toast pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-accent/25 bg-bg-panel px-4 py-3 shadow-lg">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">New block mined</p>
        <p className="font-mono text-sm font-bold tabular-nums text-fg">#{formatHeight(block.height)}</p>
      </div>
    </div>
  );
}
