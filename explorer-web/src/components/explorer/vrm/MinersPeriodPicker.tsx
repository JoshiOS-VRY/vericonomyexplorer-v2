"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MINERS_PERIODS, type MinersPeriodId } from "@/lib/minersPeriods";

export function MinersPeriodPicker({
  period,
  loading,
  onSelect,
}: {
  period: MinersPeriodId;
  loading?: boolean;
  onSelect: (period: MinersPeriodId) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {MINERS_PERIODS.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant={period === option.id ? "primary" : "secondary"}
          size="sm"
          disabled={loading}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </Button>
      ))}
      {loading ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading miners…
        </span>
      ) : null}
    </div>
  );
}
