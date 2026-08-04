"use client";

import { formatBRL } from "@/lib/format";

interface TooltipEntry {
  name?: string | number;
  value?: number | string | Array<number | string> | null;
  color?: string;
  dataKey?: string | number;
}

/**
 * Tooltip dos gráficos do financeiro — mesma linguagem visual do dashboard,
 * mas ignorando séries sem valor no ponto (o corte entre realizado e previsto
 * deixa um dos lados nulo em cada dia).
 */
export function FinanceTooltip({
  active,
  payload,
  label,
  nameMap,
  suffix,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  nameMap?: Record<string, string>;
  /** Texto auxiliar, ex.: "previsão". */
  suffix?: string;
}) {
  const entries = (payload ?? []).filter(
    (entry) => entry.value !== null && entry.value !== undefined
  );
  if (!active || entries.length === 0) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined ? (
        <p className="mb-1 font-medium text-foreground">
          {label}
          {suffix ? (
            <span className="ml-1 font-normal text-muted-foreground">{suffix}</span>
          ) : null}
        </p>
      ) : null}
      <div className="space-y-0.5">
        {entries.map((entry, index) => (
          <p
            key={index}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            {nameMap?.[String(entry.dataKey ?? entry.name)] ?? String(entry.name)}
            {": "}
            <span className="font-medium tabular-nums text-foreground">
              {typeof entry.value === "number"
                ? formatBRL(entry.value)
                : String(entry.value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
