import Link from "next/link";
import type { IndexedBlock } from "@/lib/api/types";
import { chainAddressPath, type ChainId } from "@/lib/chainDisplay";
import { isVeriumPoolExtracted } from "@/lib/veriumPoolExtracted";
import { cn, ellipsizeMiddle } from "@/lib/utils";

function veriumPoolPillClass(className?: string) {
  return cn("extracted-by-verium-pool", className);
}

export function ExtractedByCell({
  block,
  chainId,
  className,
}: {
  block: Pick<IndexedBlock, "extractedBy" | "extractedByAddress" | "extractedByLink">;
  chainId: ChainId;
  className?: string;
}) {
  const showVeriumPoolPill =
    chainId === "vrm" && isVeriumPoolExtracted(block);

  if (block.extractedBy && block.extractedByLink) {
    return (
      <Link
        href={block.extractedByLink}
        title={block.extractedBy}
        className={
          showVeriumPoolPill
            ? veriumPoolPillClass(className)
            : (className ?? "text-sm font-medium text-accent hover:underline")
        }
        target="_blank"
        rel="noreferrer"
      >
        {block.extractedBy}
      </Link>
    );
  }

  if (block.extractedBy) {
    return (
      <span
        className={
          showVeriumPoolPill
            ? veriumPoolPillClass(className)
            : (className ?? "text-sm font-medium text-fg")
        }
        title={block.extractedBy}
      >
        {block.extractedBy}
      </span>
    );
  }

  if (block.extractedByAddress) {
    return (
      <Link
        href={chainAddressPath(chainId, block.extractedByAddress)}
        title={block.extractedByAddress}
        className={className ?? "text-sm font-medium text-accent hover:underline"}
      >
        {ellipsizeMiddle(block.extractedByAddress, 24)}
      </Link>
    );
  }

  return <span className={className ?? "text-sm text-fg-muted"}>Unknown</span>;
}
