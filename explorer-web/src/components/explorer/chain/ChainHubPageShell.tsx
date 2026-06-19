import type { ChainId } from '@/lib/chainDisplay';

export function ChainHubPageShell({
  chainId,
  children,
}: {
  chainId: ChainId;
  children: React.ReactNode;
}) {
  return (
    <div className="chain-hub-page" data-chain={chainId}>
      {children}
    </div>
  );
}

export function ChainHubSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title ? <h2 className="chain-hub-section-label">{title}</h2> : null}
      {children}
    </section>
  );
}
