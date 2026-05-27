"use client";

import { ExplorerSearchCombobox, type RecentBlocksByChain } from "@/components/explorer/ExplorerSearchCombobox";

export function SearchForm({
  variant = "default",
  recentBlocks,
}: {
  action?: string;
  variant?: "default" | "blockchair";
  recentBlocks?: RecentBlocksByChain;
}) {
  return <ExplorerSearchCombobox variant={variant} recentBlocks={recentBlocks} />;
}
