import Link from "next/link";
import type { IndexedBlock } from "@/lib/api/types";
import { ellipsizeMiddle } from "@/lib/utils";

export function ExtractedByCell({
  block,
  className,
}: {
  block: Pick<IndexedBlock, "extractedBy" | "extractedByAddress">;
  className?: string;
}) {
  if (block.extractedByAddress) {
    return (
      <Link
        href={`/vrm/address/${block.extractedByAddress}`}
        title={block.extractedByAddress}
        className={className ?? "text-sm font-medium text-accent hover:underline"}
      >
        {ellipsizeMiddle(block.extractedByAddress, 24)}
      </Link>
    );
  }

  if (block.extractedBy) {
    return (
      <span className={className ?? "text-sm font-medium text-fg"} title={block.extractedBy}>
        {block.extractedBy}
      </span>
    );
  }

  return <span className={className ?? "text-sm text-fg-muted"}>Unknown</span>;
}
