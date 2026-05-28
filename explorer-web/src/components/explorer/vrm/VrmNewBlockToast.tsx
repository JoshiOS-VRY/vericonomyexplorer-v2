import { NewBlockToast } from "@/components/explorer/home/LiveBlocksFeed";
import type { IndexedBlock } from "@/lib/api/types";

export function VrmNewBlockToast({ block }: { block: IndexedBlock }) {
  return <NewBlockToast block={block} chainId="vrm" />;
}
