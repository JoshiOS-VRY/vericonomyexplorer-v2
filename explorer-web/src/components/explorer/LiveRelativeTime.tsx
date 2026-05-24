"use client";

import { useEffect, useState } from "react";
import { cn, formatBlockAge, formatUnixTime } from "@/lib/utils";

export type LiveRelativeTimeInterval = "second" | "minute";

const INTERVAL_MS: Record<LiveRelativeTimeInterval, number> = {
  second: 1_000,
  minute: 60_000,
};

export function LiveRelativeTime({
  time,
  className,
  interval = "second",
  fixedWidth = false,
}: {
  time: number | null;
  className?: string;
  /** All block ages typically use "second". */
  interval?: LiveRelativeTimeInterval;
  /** Reserve fixed width in tables so adjacent columns do not shift. */
  fixedWidth?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (time == null) return;

    const id = window.setInterval(() => {
      setTick((value) => value + 1);
    }, INTERVAL_MS[interval]);

    return () => window.clearInterval(id);
  }, [time, interval]);

  if (!time) {
    return <span className={className}>—</span>;
  }

  const title = formatUnixTime(time);
  const classes = cn(fixedWidth && "bc-age-text", className);

  // Relative time depends on Date.now(); render only after mount so SSR and hydration match.
  if (!mounted) {
    return (
      <span className={classes} title={title} aria-hidden="true">
        {"\u00a0"}
      </span>
    );
  }

  return (
    <span className={classes} title={title}>
      {formatBlockAge(time)}
    </span>
  );
}
