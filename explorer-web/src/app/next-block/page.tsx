import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertBanner, SummaryGrid } from "@/components/explorer/ExplorerUi";
import { getNextBlock } from "@/lib/api/legacy";

export default async function NextBlockPage() {
  try {
    const data = await getNextBlock();
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Next Block</h1>
        <Card>
          <CardHeader><CardTitle>Template</CardTitle></CardHeader>
          <CardContent>
            <SummaryGrid
              items={[
                { label: "Height", value: String((data as Record<string, unknown>).height ?? "N/A") },
                { label: "Tx Count", value: String((data as Record<string, unknown>).num_tx ?? (data as Record<string, unknown>).txCount ?? "N/A") },
                { label: "Size", value: String((data as Record<string, unknown>).size ?? "N/A") },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <AlertBanner title="Next Block Unavailable">
        {error instanceof Error ? error.message : "Unable to load next block template."}
      </AlertBanner>
    );
  }
}
