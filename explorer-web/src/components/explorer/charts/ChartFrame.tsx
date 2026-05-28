"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartFrame({
  chainId,
  children,
  className,
  heightClass = "h-80 sm:h-96",
}: {
  chainId?: "vrm" | "vrc";
  children: ReactNode;
  className?: string;
  heightClass?: string;
}) {
  return (
    <div
      className={cn(
        "insights-chart-frame relative rounded-xl",
        chainId === "vrm" && "insights-chart-frame-vrm",
        chainId === "vrc" && "insights-chart-frame-vrc",
        !chainId && "insights-chart-frame-neutral",
        className,
      )}
    >
      <div
        className="insights-chart-frame-glow pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
        aria-hidden
      />
      <div className={cn("insights-chart-canvas relative w-full px-1 pt-1", heightClass)}>
        {children}
      </div>
    </div>
  );
}
