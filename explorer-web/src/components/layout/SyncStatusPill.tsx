"use client";

import { useEffect, useState } from "react";
import { getTipStreamUrl } from "@/lib/api/client";
import { cn, formatNumber } from "@/lib/utils";

interface TipEvent {
  height: number;
  hash: string;
  time: number;
}

export function SyncStatusPill() {
  const [label, setLabel] = useState("Verium");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const source = new EventSource(getTipStreamUrl("vrm"));

    source.addEventListener("tip", (event) => {
      try {
        const tip = JSON.parse(event.data) as TipEvent;
        setLabel(formatNumber(tip.height));
        setOnline(true);
      } catch {
        setLabel("Offline");
        setOnline(false);
      }
    });

    source.onerror = () => {
      setLabel("Offline");
      setOnline(false);
    };

    return () => source.close();
  }, []);

  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold tabular-nums sm:inline-flex",
        online
          ? "border-border bg-bg-subtle text-fg-muted"
          : "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          online ? "bg-success live-dot-breathe" : "bg-warning",
        )}
      />
      {online ? `#${label}` : label}
    </div>
  );
}
