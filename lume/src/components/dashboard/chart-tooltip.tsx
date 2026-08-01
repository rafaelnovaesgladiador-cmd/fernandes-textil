"use client";

import { formatBRL } from "@/lib/format";

interface TooltipEntry {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  dataKey?: string | number;
}

/** Tooltip padrão dos gráficos — valores em R$, texto em tokens de texto. */
export function ChartTooltip({
  active,
  payload,
  label,
  nameMap,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  nameMap?: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-medium text-foreground">{label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, index) => (
          <p key={index} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            {nameMap?.[String(entry.dataKey ?? entry.name)] ?? String(entry.name)}
            {": "}
            <span className="font-medium tabular-nums text-foreground">
              {typeof entry.value === "number" ? formatBRL(entry.value) : String(entry.value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
