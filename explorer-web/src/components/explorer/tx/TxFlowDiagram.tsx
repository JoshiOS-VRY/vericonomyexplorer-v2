import Link from 'next/link';
import { MonoLink } from '@/components/explorer/ExplorerUi';
import type { TransactionResult } from '@/lib/api/types';
import { chainAddressPath, chainBlockPath, type ChainId } from '@/lib/chainDisplay';
import {
  classifyOutputRole,
  formatAmountPair,
  isCoinbaseTx,
  outputRoleLabel,
} from '@/lib/txLabels';
import { cn, ellipsizeMiddle } from '@/lib/utils';

function FlowArrow() {
  return (
    <div
      className="hidden shrink-0 items-center justify-center px-2 text-fg-subtle sm:flex"
      aria-hidden
    >
      <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
        <path
          d="M0 8H22M22 8L16 2M22 8L16 14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function FlowNode({
  label,
  address,
  amount,
  chainId,
  tone = 'neutral',
}: {
  label: string;
  address?: string | null;
  amount: string;
  chainId: ChainId;
  tone?: 'neutral' | 'accent' | 'success' | 'muted';
}) {
  const toneClasses = {
    neutral: 'border-border bg-bg-panel/60',
    accent: 'border-accent/30 bg-accent/10',
    success: 'border-success/30 bg-success/10',
    muted: 'border-border/70 bg-bg-subtle/50',
  };

  return (
    <div className={cn('min-w-0 flex-1 rounded-lg border px-3 py-2.5', toneClasses[tone])}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">{label}</div>
      {address ? (
        <div className="mt-1">
          <MonoLink
            href={chainAddressPath(chainId, address)}
            value={address}
            maxLength={18}
            chainId={chainId}
          />
        </div>
      ) : (
        <div className="mt-1 text-xs text-fg-muted">coinbase</div>
      )}
      <div className="mt-1 text-sm font-semibold tabular-nums text-fg">{amount}</div>
    </div>
  );
}

function CompactFlowSummary({
  inputCount,
  outputCount,
  totalsLine,
  children,
}: {
  inputCount: number;
  outputCount: number;
  totalsLine?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-fg">
        <span className="text-fg-muted">
          {inputCount} input{inputCount === 1 ? '' : 's'} → {outputCount} output
          {outputCount === 1 ? '' : 's'}
        </span>
        {totalsLine ? <span className="ml-2 text-xs text-fg-subtle">{totalsLine}</span> : null}
        <span className="ml-2 text-xs text-fg-subtle">(expand flow)</span>
      </summary>
      <div className="border-t border-border px-5 py-4">{children}</div>
    </details>
  );
}

export function TxFlowDiagram({
  result,
  chainId,
}: {
  result: TransactionResult;
  chainId: ChainId;
}) {
  const tx = result.transaction!;
  const changeOutputs = result.changeOutputs ?? [];
  const totals = result.totals;
  const isMining = isCoinbaseTx(tx);
  const showCompact = result.inputs.length > 2 || result.outputs.length > 2;

  const flowBody = isMining ? (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <FlowNode
        label="Mining reward"
        address={result.outputs[0]?.address}
        amount={result.outputs[0] ? formatAmountPair(result.outputs[0].value) : 'N/A'}
        chainId={chainId}
        tone="accent"
      />
    </div>
  ) : (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">Inputs</div>
        <div className="flex flex-col gap-2">
          {result.inputs.map((input) => (
            <FlowNode
              key={`in-${input.n}`}
              label={`Input #${input.n}`}
              address={input.address}
              amount={input.value ? formatAmountPair(input.value) : 'N/A'}
              chainId={chainId}
            />
          ))}
        </div>
      </div>

      <FlowArrow />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
          Outputs
        </div>
        <div className="flex flex-col gap-2">
          {result.outputs.map((output) => {
            const role = classifyOutputRole(output, changeOutputs, isMining);
            return (
              <FlowNode
                key={`out-${output.n}`}
                label={outputRoleLabel(role)}
                address={output.address}
                amount={formatAmountPair(output.value)}
                chainId={chainId}
                tone={role === 'change' ? 'muted' : role === 'payment' ? 'success' : 'neutral'}
              />
            );
          })}
        </div>
      </div>

      {totals ? (
        <div className="flex shrink-0 items-start lg:max-w-[120px]">
          <div className="rounded-lg border border-border/70 bg-bg-subtle/60 px-3 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Fee
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-fg">
              {formatAmountPair(totals.fee)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (showCompact) {
    const totalsLine = totals
      ? `${formatAmountPair(totals.input)} in · ${formatAmountPair(totals.output)} out · ${formatAmountPair(totals.fee)} fee`
      : undefined;
    return (
      <CompactFlowSummary
        inputCount={result.inputs.length}
        outputCount={result.outputs.length}
        totalsLine={totalsLine}
      >
        {flowBody}
      </CompactFlowSummary>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Value flow</h2>
      </div>
      <div className="px-5 py-4">{flowBody}</div>
    </section>
  );
}

export function TxFlowMetaLink({
  blockHeight,
  chainId,
}: {
  blockHeight: number;
  chainId: ChainId;
}) {
  return (
    <Link href={chainBlockPath(chainId, blockHeight)} className="text-accent hover:underline">
      block {blockHeight.toLocaleString()}
    </Link>
  );
}

export function TxFlowHashHint({ txid }: { txid: string }) {
  return <span className="text-xs text-fg-subtle">{ellipsizeMiddle(txid, 20)}</span>;
}
