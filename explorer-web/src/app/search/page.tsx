import { SearchForm } from "@/components/explorer/SearchForm";
import { Card, CardContent } from "@/components/ui/Card";

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search</h1>
      <Card>
        <CardContent className="py-6">
          <SearchForm action="/api/search" />
        </CardContent>
      </Card>
    </div>
  );
}
