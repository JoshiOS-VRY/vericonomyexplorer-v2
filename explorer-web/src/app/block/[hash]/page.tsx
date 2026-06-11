import { AlertBanner, MonoLink, TimeCell } from '@/components/explorer/ExplorerUi';
import { SummaryRow } from '@/components/legacy/LegacyShared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getBlockByHashOrHeight } from '@/lib/api/legacy';
import { formatNumber } from '@/lib/utils';

export default async function BlockPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  try {
    const block = (await getBlockByHashOrHeight(hash)) as Record<string, unknown>;
    if (block.success === false) {
      return (
        <AlertBanner title="Block Not Found">No block matched this hash or height.</AlertBanner>
      );
    }

    const height = Number(block.height);
    const txids = (block.tx as string[] | undefined) ?? [];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Block {formatNumber(height)}</h1>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <SummaryRow
              items={[
                {
                  label: 'Hash',
                  value: (
                    <MonoLink
                      href={`/block/${String(block.hash)}`}
                      value={String(block.hash)}
                      maxLength={32}
                    />
                  ),
                },
                { label: 'Confirmations', value: formatNumber(Number(block.confirmations ?? 0)) },
                { label: 'Transactions', value: formatNumber(txids.length) },
                { label: 'Size', value: block.size ? formatNumber(Number(block.size)) : 'N/A' },
                { label: 'Time', value: <TimeCell time={Number(block.time)} /> },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {txids.map((txid, index) => (
                <div
                  key={txid}
                  className="flex items-center gap-3 border-b border-border py-2 last:border-0"
                >
                  <span className="w-8 text-fg-muted">{index}</span>
                  <MonoLink href={`/tx/${txid}`} value={txid} maxLength={48} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <AlertBanner title="Block Lookup Failed">
        {error instanceof Error ? error.message : 'Unable to load block.'}
      </AlertBanner>
    );
  }
}
