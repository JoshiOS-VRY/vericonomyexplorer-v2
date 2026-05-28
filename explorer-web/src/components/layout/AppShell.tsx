import { SearchRecentBlocksProvider } from "@/components/explorer/SearchRecentBlocksContext";
import { ClientProviders } from "@/components/layout/ClientProviders";
import { BlockchairHeader } from "@/components/layout/BlockchairHeader";
import type { ChainSummary } from "@/lib/api/types";

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
        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
        <footer className="border-t border-border bg-bg-panel py-4 text-center text-xs text-fg-subtle">
          VeriConomy Explorer · Verium (VRM) · VeriCoin (VRC)
        </footer>
      </div>
    </ClientProviders>
  );
}
