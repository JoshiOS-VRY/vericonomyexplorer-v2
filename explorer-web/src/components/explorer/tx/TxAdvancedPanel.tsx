'use client';

import Link from 'next/link';
import { ChainAddressLink } from '@/components/explorer/address/ChainAddressLink';
import { DataTable, MonoLink } from '@/components/explorer/ExplorerUi';
import { CopyButton } from '@/components/explorer/BlockDetail';
import type { TransactionResult } from '@/lib/api/types';
import { chainAddressPath, chainTxPath, type ChainId } from '@/lib/chainDisplay';
import { ellipsizeMiddle } from '@/lib/utils';

export function TxAdvancedPanel({
  result,
  chainId,
}: {
  result: TransactionResult;
  chainId: ChainId;
}) {
  const unresolvedInputs = result.inputs.filter((input) => input.resolved === false);

  return (
    <details className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium uppercase tracking-wide text-fg-muted">
        Advanced details
      </summary>
      <div className="space-y-4 border-t border-border px-5 py-4">
        {unresolvedInputs.length > 0 ? (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            {unresolvedInputs.length} input
            {unresolvedInputs.length === 1 ? '' : 's'} could not be fully not yet resolved. Balances
            depending on these spends may be incomplete.
          </div>
        ) : null}

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
            Inputs
          </h3>
          {result.inputs.length === 0 ? (
            <p className="text-sm text-fg-muted">No inputs found.</p>
          ) : (
            <DataTable
              headers={['#', 'Address', 'Value', 'Provenance']}
              rows={result.inputs.map((input) => [
                String(input.n),
                input.address ? (
                  <MonoLink
                    key="a"
                    href={chainAddressPath(chainId, input.address)}
                    value={input.address}
                    maxLength={20}
                    chainId={chainId}
                  />
                ) : (
                  <span className="text-fg-muted">coinbase</span>
                ),
                input.value ? `${input.value.amount} ${input.value.ticker}` : 'N/A',
                input.prevTxid ? (
                  <Link
                    key="p"
                    href={`${chainTxPath(chainId, input.prevTxid)}${input.prevVout != null ? `#output-${input.prevVout}` : ''}`}
                    className="text-accent hover:underline"
                  >
                    spent from output #{input.prevVout ?? '?'}
                  </Link>
                ) : input.resolved === false ? (
                  <span className="text-warning">unresolved</span>
                ) : (
                  <span className="text-fg-muted">—</span>
                ),
              ])}
            />
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
            Outputs
          </h3>
          {result.outputs.length === 0 ? (
            <p className="text-sm text-fg-muted">No outputs found.</p>
          ) : (
            <DataTable
              headers={['#', 'Address', 'Value', 'Lifecycle', 'Script']}
              rows={result.outputs.map((output) => [
                <span key="n" id={`output-${output.n}`} className="font-mono">
                  {output.n}
                </span>,
                output.address ? (
                  <MonoLink
                    key="a"
                    href={chainAddressPath(chainId, output.address)}
                    value={output.address}
                    maxLength={20}
                    chainId={chainId}
                  />
                ) : (
                  <span className="text-fg-muted">{output.scriptType || 'unknown'}</span>
                ),
                `${output.value.amount} ${output.value.ticker}`,
                output.isSpent ? (
                  <span key="s" className="text-fg-muted">
                    Spent in{' '}
                    <Link
                      href={chainTxPath(chainId, output.spentByTxid!)}
                      className="text-accent hover:underline"
                    >
                      {ellipsizeMiddle(output.spentByTxid ?? '', 16)}
                    </Link>
                    {output.spentHeight != null
                      ? ` · block ${output.spentHeight.toLocaleString()}`
                      : ''}
                  </span>
                ) : (
                  <span key="s" className="text-success">
                    Unspent UTXO
                  </span>
                ),
                <span key="script" className="text-xs text-fg-muted">
                  {output.scriptType || '—'}
                  {output.scriptPubKey ? (
                    <>
                      {' · '}
                      <code>{ellipsizeMiddle(output.scriptPubKey, 20)}</code>
                      <CopyButton value={output.scriptPubKey} label="Copy script" />
                    </>
                  ) : null}
                </span>,
              ])}
            />
          )}
        </section>

        {result.addressEvents.length > 0 ? (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
              Address deltas
            </h3>
            <DataTable
              headers={['Address', 'Event', 'Delta']}
              rows={result.addressEvents.map((event) => [
                <ChainAddressLink
                  key="a"
                  chainId={chainId}
                  address={event.address}
                  maxLength={24}
                  className="hash-mono"
                />,
                event.eventType,
                <span
                  key="d"
                  className={event.deltaAtomic.startsWith('-') ? 'text-danger' : 'text-success'}
                >
                  {event.delta.amount} {event.delta.ticker}
                </span>,
              ])}
            />
          </section>
        ) : null}
      </div>
    </details>
  );
}
