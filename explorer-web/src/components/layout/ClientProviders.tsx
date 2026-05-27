"use client";

import { RelativeTimeProvider } from "@/components/explorer/RelativeTimeProvider";
import { TipStreamProvider } from "@/components/explorer/TipStreamProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <RelativeTimeProvider>
      <TipStreamProvider>{children}</TipStreamProvider>
    </RelativeTimeProvider>
  );
}
