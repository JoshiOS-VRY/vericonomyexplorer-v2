import Link from "next/link";
import { cn } from "@/lib/utils";

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-fg-subtle">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span className="text-border-strong">/</span> : null}
              {item.href && !last ? (
                <Link href={item.href} className="text-fg-muted transition hover:text-accent">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(last && "font-medium text-fg")}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
