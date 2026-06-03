"use client";

import { RelativeTimeProvider } from "@/components/explorer/RelativeTimeProvider";
import { TipStreamProvider } from "@/components/explorer/TipStreamProvider";
import { NavigationDebug } from "@/components/layout/NavigationDebug";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <RelativeTimeProvider>
      <TipStreamProvider>
        <NavigationDebug />
        {children}
      </TipStreamProvider>
    </RelativeTimeProvider>
  );
}
