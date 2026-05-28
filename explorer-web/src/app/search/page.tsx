import { SearchForm } from "@/components/explorer/SearchForm";
import { Card, CardContent } from "@/components/ui/Card";

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Search the blockchain</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Look up blocks, transactions, and addresses on Verium (VRM) or VeriCoin (VRC). Use the
          field below or the search bar in the header from any page.
        </p>
      </div>
      <Card>
        <CardContent className="py-6">
          <SearchForm variant="blockchair" />
          <ul className="mt-4 space-y-1 text-xs text-fg-subtle">
            <li>Block height — numeric value, e.g. <span className="font-mono">250000</span></li>
            <li>Block hash or txid — 64-character hex string</li>
            <li>Address — wallet address on either chain</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
