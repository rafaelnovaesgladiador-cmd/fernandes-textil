"use client";

import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SEGMENT_BY_KEY, SEGMENTS, type SegmentKey } from "./segments";

/**
 * Chips de segmento no desktop; no celular a mesma lista vira uma gaveta,
 * para não empurrar a tabela para baixo da dobra.
 */
export function SegmentFilter({
  value,
  counts,
  onChange,
}: {
  value: SegmentKey;
  counts: Record<SegmentKey, number>;
  onChange: (value: SegmentKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = SEGMENT_BY_KEY[value];

  return (
    <div>
      {/* Desktop e tablet */}
      <div
        className="hidden flex-wrap gap-2 sm:flex"
        role="group"
        aria-label="Filtrar por segmento"
      >
        {SEGMENTS.map((segment) => {
          const selected = segment.key === value;
          return (
            <button
              key={segment.key}
              type="button"
              onClick={() => onChange(segment.key)}
              aria-pressed={selected}
              title={segment.description}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
                selected
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary"
              )}
            >
              {segment.label}
              <span
                className={cn(
                  "tabular-nums",
                  selected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {formatNumber(counts[segment.key] ?? 0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Celular */}
      <div className="sm:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <SlidersHorizontal /> Segmento: {active.label}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatNumber(counts[value] ?? 0)}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto pb-6">
            <SheetHeader>
              <SheetTitle>Segmentos de clientes</SheetTitle>
              <SheetDescription>
                Cada grupo pede uma conversa diferente.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4">
              {SEGMENTS.map((segment) => {
                const selected = segment.key === value;
                return (
                  <button
                    key={segment.key}
                    type="button"
                    onClick={() => {
                      onChange(segment.key);
                      setOpen(false);
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg p-3 text-left transition-colors",
                      selected ? "bg-secondary" : "hover:bg-secondary/60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {segment.label}
                        {selected ? <Check className="size-3.5" /> : null}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {segment.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatNumber(counts[segment.key] ?? 0)}
                    </span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
