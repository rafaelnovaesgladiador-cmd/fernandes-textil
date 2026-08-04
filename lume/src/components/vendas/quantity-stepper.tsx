"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Controle de quantidade com botões grandes (44px) — pensado para o toque
 * com uma mão no balcão. `max` trava no estoque disponível.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Complemento do aria-label, ex.: "de Vestido Midi Floral". */
  label: string;
  className?: string;
}) {
  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border bg-card p-0.5",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-md lg:size-9"
        aria-label={`Diminuir quantidade ${label}`}
        disabled={!canDecrease}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span
        aria-live="polite"
        className="min-w-8 text-center text-sm font-semibold tabular-nums"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-md lg:size-9"
        aria-label={`Aumentar quantidade ${label}`}
        disabled={!canIncrease}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
