import Link from 'next/link';
import Image from 'next/image';
import { sidebarNav } from '@/components/layout/navLinks';
import { isNavLinkActive } from '@/lib/navUtils';
import { cn } from '@/lib/utils';

function NavIcon({ name }: { name: SidebarItemIcon }) {
  const className = 'h-4 w-4 shrink-0';
  switch (name) {
    case 'overview':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
        </svg>
      );
    case 'explorer':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" />
        </svg>
      );
    case 'richlist':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case 'leaderboard':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M8 21V10M12 21V3M16 21v-6" />
        </svg>
      );
    case 'blocks':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'api':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M16 18 22 12 16 6M8 6 2 12l6 6" />
        </svg>
      );
    case 'insights':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 3 3 5-6" />
        </svg>
      );
  }
}

type SidebarItemIcon = (typeof sidebarNav)[number]['icon'];

function SidebarLink({
  pathname,
  href,
  label,
  icon,
  exact,
  prefix,
}: {
  pathname: string;
  href: string;
  label: string;
  icon: SidebarItemIcon;
  exact?: boolean;
  prefix?: boolean;
}) {
  const active = isNavLinkActive(pathname, href, exact, prefix);
  return (
    <Link
      href={href}
      data-nav-link
      data-nav-exact={exact ? 'true' : undefined}
      data-nav-prefix={prefix ? 'true' : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-bg-panel text-fg' : 'text-fg-muted hover:bg-bg-panel hover:text-fg'
      )}
    >
      <NavIcon name={icon} />
      {label}
    </Link>
  );
}

export function Sidebar({ pathname }: { pathname: string }) {
  const explorerItems = sidebarNav.filter((item) => item.section === 'explorer');
  const dataItems = sidebarNav.filter((item) => item.section === 'data');

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-subtle lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div className="flex items-center gap-3 px-4 py-4">
        <Image
          src="/img/vericonomy/vericonomylogo.png"
          alt="Vericonomy"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg object-contain"
        />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">VeriConomy</div>
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
            Binary Chain · Explorer
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-2">
        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
            Explorer
          </p>
          <div className="flex flex-col gap-0.5">
            {explorerItems.map((item) => (
              <SidebarLink key={item.href} pathname={pathname} {...item} />
            ))}
          </div>
        </div>
        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
            Data
          </p>
          <div className="flex flex-col gap-0.5">
            {dataItems.map((item) => (
              <SidebarLink key={item.href} pathname={pathname} {...item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-border px-5 py-3 text-xs text-fg-subtle">
        VeriConomy Explorer
      </div>
    </aside>
  );
}

export function MobileNav({ pathname }: { pathname: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
      {sidebarNav.map((item) => {
        const active = isNavLinkActive(pathname, item.href, item.exact, item.prefix);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-nav-link
            data-nav-exact={item.exact ? 'true' : undefined}
            data-nav-prefix={item.prefix ? 'true' : undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              active ? 'bg-bg-panel text-fg' : 'text-fg-muted hover:bg-bg-panel hover:text-fg'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
