import { getPageTitle } from "@/lib/pageTitles";
import { MobileNav } from "@/components/layout/Sidebar";
import { SyncStatusPills } from "@/components/layout/SyncStatusPills";
import type { ChainSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const themeOptions: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "System theme" },
  { mode: "light", label: "Light theme" },
  { mode: "dark", label: "Dark theme" },
];

/** Active state is applied client-side by explorer-ui.js after hydration. */
function ThemeToggle() {
  return (
    <div
      className="inline-flex rounded-md border border-border bg-bg-subtle p-1"
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
            "theme-toggle-btn inline-flex h-8 items-center rounded px-2.5 text-[11px] font-medium transition-colors",
            "text-fg-muted hover:bg-bg-panel hover:text-fg",
          )}
        >
          {optionMode === "system" ? "Auto" : optionMode === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}

export function TopBar({
  pathname,
  initialVrmSummary,
  initialVrcSummary,
}: {
  pathname: string;
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
}) {
  return (
    <header className="shrink-0 border-b border-border bg-bg-subtle">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-8">
        <h1 className="truncate text-lg font-semibold">{getPageTitle(pathname)}</h1>
        <div className="flex items-center gap-3">
          <SyncStatusPills
            initialVrmSummary={initialVrmSummary}
            initialVrcSummary={initialVrcSummary}
          />
          <ThemeToggle />
        </div>
      </div>
      <div className="border-t border-border/60 px-4 pb-2 sm:px-8 lg:hidden">
        <MobileNav pathname={pathname} />
      </div>
    </header>
  );
}
