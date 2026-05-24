import { BlockchairHeader } from "@/components/layout/BlockchairHeader";

export function AppShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <BlockchairHeader pathname={pathname} />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
      <footer className="border-t border-border bg-bg-panel py-4 text-center text-xs text-fg-subtle">
        VeriConomy Explorer · Verium (VRM)
      </footer>
    </div>
  );
}
