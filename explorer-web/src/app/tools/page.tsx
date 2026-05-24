import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";

const tools = [
  { href: "/rpc-terminal", label: "RPC Terminal" },
  { href: "/rpc-browser", label: "RPC Browser" },
  { href: "/terminal", label: "Terminal" },
  { href: "/tx-stats", label: "Transaction Stats" },
  { href: "/difficulty-history", label: "Difficulty History" },
  { href: "/utxo-set", label: "UTXO Set" },
  { href: "/next-halving", label: "Next Halving" },
  { href: "/api/docs", label: "API Docs" },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tools</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="transition-colors hover:bg-bg-subtle">
              <CardContent className="py-5 text-sm font-medium">{tool.label}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
