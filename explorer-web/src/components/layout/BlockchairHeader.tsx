import Link from "next/link";
import Image from "next/image";
import { SearchForm } from "@/components/explorer/SearchForm";
import { SyncStatusPill } from "@/components/layout/SyncStatusPill";
import { sidebarNav } from "@/components/layout/navLinks";
import { isNavLinkActive } from "@/lib/navUtils";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const themeOptions: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "System theme" },
  { mode: "light", label: "Light theme" },
  { mode: "dark", label: "Dark theme" },
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
            "theme-toggle-btn inline-flex h-7 items-center rounded px-2 text-[11px] font-medium transition-colors",
            "text-fg-muted hover:bg-bg-subtle hover:text-fg",
          )}
        >
          {optionMode === "system" ? "Auto" : optionMode === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}

const primaryNav = sidebarNav.filter((item) =>
  ["/", "/vrm", "/vrm/richlist", "/vrm/leaderboard"].includes(item.href),
);

export function BlockchairHeader({ pathname }: { pathname: string }) {
  return (
    <header className="bc-header sticky top-0 z-40 border-b border-border bg-bg-panel shadow-sm">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/img/vericonomy/binary-chain-icon.svg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <div className="leading-tight">
            <span className="block text-sm font-bold tracking-tight text-fg">VeriConomy</span>
            <span className="block text-[11px] font-medium text-accent">Block explorer</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {primaryNav.map((item) => {
            const active = isNavLinkActive(pathname, item.href, item.exact, item.prefix);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-nav-link
                data-nav-exact={item.exact ? "true" : undefined}
                data-nav-prefix={item.prefix ? "true" : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
                )}
              >
                {item.label === "Overview" ? "Home" : item.label}
              </Link>
            );
          })}
          <Link
            href="/tools"
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              pathname.startsWith("/tools")
                ? "bg-accent/10 text-accent"
                : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
            )}
          >
            Tools
          </Link>
          <Link
            href="/api/docs"
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              pathname.startsWith("/api")
                ? "bg-accent/10 text-accent"
                : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
            )}
          >
            API
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SyncStatusPill />
          <ThemeToggle />
        </div>
      </div>

      <div className="border-t border-border/80 bg-bg-subtle/50 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <SearchForm variant="blockchair" />
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-2 md:hidden sm:px-6">
        <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto">
          {primaryNav.map((item) => {
            const active = isNavLinkActive(pathname, item.href, item.exact, item.prefix);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded px-2.5 py-1 text-xs font-medium",
                  active ? "bg-accent/10 text-accent" : "text-fg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
