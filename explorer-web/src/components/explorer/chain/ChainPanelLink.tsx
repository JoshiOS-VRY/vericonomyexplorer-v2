import Link from "next/link";

export function ChainPanelLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-xs font-semibold text-accent hover:underline">
      {label}
    </Link>
  );
}
