'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { SearchForm } from '@/components/explorer/SearchForm';
import { useSearchRecentBlocks } from '@/components/explorer/SearchRecentBlocksContext';
import { SyncStatusPills } from '@/components/layout/SyncStatusPills';
import {
  headerNav,
  type HeaderNavDropdownItem,
  type HeaderNavItem,
  type HeaderNavLinkItem,
} from '@/components/layout/navLinks';
import { useHydrated } from '@/hooks/useHydrated';
import { isNavDropdownActive, isNavLinkActive } from '@/lib/navUtils';
import type { ChainSummary } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type ThemeMode = 'light' | 'dark' | 'system';

const themeOptions: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System theme' },
  { mode: 'light', label: 'Light theme' },
  { mode: 'dark', label: 'Dark theme' },
];

function ThemeToggle() {
  return (
    <div
      className="bc-theme-toggle inline-flex rounded border border-border bg-bg-panel p-0.5"
      suppressHydrationWarning
    >
      {themeOptions.map(({ mode: optionMode, label }) => (
        <button
          key={optionMode}
          type="button"
          data-theme-mode={optionMode}
          aria-label={label}
          aria-pressed="false"
          suppressHydrationWarning
          className={cn(
            'theme-toggle-btn inline-flex h-7 items-center rounded px-2 text-[11px] font-medium transition-colors',
            'text-fg-muted hover:bg-bg-subtle hover:text-fg'
          )}
        >
          {optionMode === 'system' ? 'Auto' : optionMode === 'light' ? 'Light' : 'Dark'}
        </button>
      ))}
    </div>
  );
}

function HeaderNavLink({
  pathname,
  item,
  className,
}: {
  pathname: string;
  item: HeaderNavLinkItem;
  className?: string;
}) {
  const active = isNavLinkActive(pathname, item.href, item.exact, item.prefix);

  return (
    <Link
      href={item.href}
      prefetch
      data-nav-link
      data-nav-exact={item.exact ? 'true' : undefined}
      data-nav-prefix={item.prefix ? 'true' : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        className,
        active ? 'bg-accent/10 text-accent' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'
      )}
    >
      {item.label}
    </Link>
  );
}

function HeaderNavDropdownMenu({
  pathname,
  item,
  className,
  style,
  onNavigate,
}: {
  pathname: string;
  item: HeaderNavDropdownItem;
  className?: string;
  style?: CSSProperties;
  onNavigate?: () => void;
}) {
  return (
    <div
      role="menu"
      style={style}
      className={cn(
        'z-[60] min-w-[10rem] rounded-md border border-border bg-bg-panel py-1 shadow-lg',
        className
      )}
    >
      {item.items.map((child) => {
        const childActive = isNavLinkActive(pathname, child.href, false, item.prefix);
        return (
          <Link
            key={child.href}
            href={child.href}
            prefetch
            role="menuitem"
            data-nav-link
            data-nav-prefix={item.prefix ? 'true' : undefined}
            aria-current={childActive ? 'page' : undefined}
            onClick={onNavigate}
            className={cn(
              'block px-3 py-2 text-sm transition-colors',
              childActive
                ? 'bg-accent/10 text-accent'
                : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'
            )}
          >
            {child.label}
          </Link>
        );
      })}
    </div>
  );
}

function HeaderNavDropdown({
  pathname,
  item,
  className,
  usePortalMenu = false,
}: {
  pathname: string;
  item: HeaderNavDropdownItem;
  className?: string;
  usePortalMenu?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = isNavDropdownActive(pathname, item.items, item.prefix);

  useEffect(() => {
    if (!open) {
      return;
    }

    function updateMenuPosition() {
      if (!usePortalMenu || !buttonRef.current) {
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: Math.max(rect.width, 160),
      });
    }

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    const listenerTimer = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.clearTimeout(listenerTimer);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, usePortalMenu]);

  const closeMenu = () => setOpen(false);

  const menu = open ? (
    <HeaderNavDropdownMenu
      pathname={pathname}
      item={item}
      onNavigate={closeMenu}
      className={usePortalMenu ? undefined : 'absolute left-0 top-[calc(100%+4px)]'}
      style={usePortalMenu ? menuStyle : undefined}
    />
  ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        data-nav-dropdown
        data-nav-prefix={item.prefix ? 'true' : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-current={active ? 'page' : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          className,
          active ? 'bg-accent/10 text-accent' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'
        )}
      >
        <span>{item.label}</span>
        <span aria-hidden className="ml-1 text-[10px] opacity-70">
          ▾
        </span>
      </button>
      {menu ? (
        usePortalMenu ? (
          createPortal(<div ref={menuRef}>{menu}</div>, document.body)
        ) : (
          <div ref={menuRef}>{menu}</div>
        )
      ) : null}
    </div>
  );
}

function HeaderNavItemView({
  pathname,
  item,
  className,
  usePortalMenu = false,
}: {
  pathname: string;
  item: HeaderNavItem;
  className?: string;
  usePortalMenu?: boolean;
}) {
  if (item.type === 'dropdown') {
    return (
      <HeaderNavDropdown
        pathname={pathname}
        item={item}
        className={className}
        usePortalMenu={usePortalMenu}
      />
    );
  }

  return <HeaderNavLink pathname={pathname} item={item} className={className} />;
}

function HeaderSearch() {
  const recentBlocks = useSearchRecentBlocks();
  return (
    <SearchForm
      variant="blockchair"
      recentBlocks={recentBlocks ?? undefined}
      inputId="explorer-search"
    />
  );
}

export function BlockchairHeader({
  pathname: pathnameProp,
  initialVrmSummary,
  initialVrcSummary,
}: {
  pathname: string;
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
}) {
  const hydrated = useHydrated();
  const pathnameFromRouter = usePathname();
  const pathname = hydrated ? (pathnameFromRouter ?? pathnameProp) : pathnameProp;

  return (
    <header className="bc-header sticky top-0 z-40 border-b border-border bg-bg-panel shadow-sm">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 sm:px-8">
        <Link href="/" prefetch className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/img/vericonomy/vericonomylogo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <div className="leading-tight">
            <span className="block text-sm font-bold tracking-tight text-fg">Vericonomy</span>
            <span className="block text-[11px] font-medium text-accent">Block explorer</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {headerNav.map((item) => (
            <HeaderNavItemView
              key={item.type === 'dropdown' ? item.label : item.href}
              pathname={pathname}
              item={item}
              className="rounded px-3 py-1.5 text-sm font-medium transition-colors"
            />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SyncStatusPills
            initialVrmSummary={initialVrmSummary}
            initialVrcSummary={initialVrcSummary}
          />
          <ThemeToggle />
        </div>
      </div>

      <div className="border-t border-border/80 bg-bg-subtle/50 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1720px]">
          <HeaderSearch />
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-2 md:hidden sm:px-6">
        <div className="mx-auto flex max-w-[1720px] flex-wrap gap-1">
          {headerNav.map((item) => (
            <HeaderNavItemView
              key={item.type === 'dropdown' ? item.label : item.href}
              pathname={pathname}
              item={item}
              usePortalMenu
              className="shrink-0 rounded px-2.5 py-1 text-xs font-medium"
            />
          ))}
        </div>
      </div>
    </header>
  );
}
