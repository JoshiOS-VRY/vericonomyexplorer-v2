import type { SourceInfo } from "@/lib/api/types";

export function formatExplorerSourceLabel(source: SourceInfo): string | null {
  const label = source.label?.trim().toLowerCase();
  if (!label || label === "index") {
    return null;
  }
  return source.label;
}

export const EXPLORER_DATA_INCOMPLETE = "Some data may be incomplete.";

export function formatExplorerUserMessage(message: string): string {
  return message
    .replace(/indexed from genesis/gi, "from genesis")
    .replace(/have been indexed/gi, "are available")
    .replace(/is indexed/gi, "is available")
    .replace(/indexed/gi, "available")
    .replace(/the index is still catching up/gi, "sync is still catching up")
    .replace(/indexer/gi, "sync")
    .replace(/\bindex\b/gi, "chain data");
}
