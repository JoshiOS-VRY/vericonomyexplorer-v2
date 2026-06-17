import { SearchRecentBlocksProvider } from '@/components/explorer/SearchRecentBlocksContext';
import { ChainLiveBootstrap } from '@/lib/chainLive/ChainLiveBootstrap';
import { ClientProviders } from '@/components/layout/ClientProviders';
import { BlockchairHeader } from '@/components/layout/BlockchairHeader';
import type { ChainSummary } from '@/lib/api/types';

export function AppShell({
  children,
  pathname,
  initialVrmSummary,
  initialVrcSummary,
}: {
  children: React.ReactNode;
  pathname: string;
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
}) {
  return (
    <ClientProviders>
      <ChainLiveBootstrap
        initialVrmSummary={initialVrmSummary}
        initialVrcSummary={initialVrcSummary}
      />
      <div className="flex min-h-screen flex-col bg-bg text-fg">
        <SearchRecentBlocksProvider
          initialVrmSummary={initialVrmSummary}
          initialVrcSummary={initialVrcSummary}
        >
          <BlockchairHeader
            pathname={pathname}
            initialVrmSummary={initialVrmSummary}
            initialVrcSummary={initialVrcSummary}
          />
        </SearchRecentBlocksProvider>
        <main className="flex-1 px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-[1720px]">{children}</div>
        </main>
        <footer className="border-t border-border bg-bg-panel py-4 text-center text-xs text-fg-subtle">
          Vericonomy Explorer · Verium (VRM) · VeriCoin (VRC)
        </footer>
      </div>
    </ClientProviders>
  );
}
