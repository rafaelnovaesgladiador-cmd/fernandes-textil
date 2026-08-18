"use client";

import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDeltaPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Cartão de indicador do Dashboard, com comparação vs. período anterior.
 * `invertDelta` marca métricas em que "subir é ruim" (ex.: despesas).
 */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  hint,
  invertDelta = false,
  className,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  icon?: LucideIcon;
  hint?: string;
  invertDelta?: boolean;
  className?: string;
}) {
  const hasDelta = delta !== undefined && delta !== null;
  const isGood = hasDelta && (invertDelta ? delta < 0 : delta > 0);
  const isFlat = hasDelta && Math.abs(delta) < 0.05;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {label}
          {hint ? (
            <Tooltip>
              <TooltipTrigger
                aria-label={`Sobre ${label}`}
                className="cursor-help text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          ) : null}
        </p>
        {Icon ? <Icon className="size-4 text-muted-foreground/60" /> : null}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </p>
      {hasDelta ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              isFlat
                ? "text-muted-foreground"
                : isGood
                  ? "text-success-text"
                  : "text-critical"
            )}
          >
            {isFlat ? null : delta > 0 ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {formatDeltaPercent(delta)}
          </span>
          {deltaLabel ? <span className="truncate">{deltaLabel}</span> : null}
        </p>
      ) : null}
    </Card>
  );
}
