"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tabela responsiva: colunas no desktop, cartões empilhados no celular.
 *
 * Cada coluna declara como se comporta no mobile — `primary` vira o título do
 * cartão, `hideOnMobile` some, e as demais aparecem como pares rótulo/valor.
 * Evita a tabela larga com rolagem lateral que inviabiliza o uso no balcão.
 */
export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Título do cartão no celular. */
  primary?: boolean;
  /** Subtítulo do cartão, logo abaixo do título. */
  secondary?: boolean;
  hideOnMobile?: boolean;
  align?: "left" | "right";
  className?: string;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  onRowClick,
  actions,
  emptyState,
  className,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Ações exibidas ao final da linha e no rodapé do cartão. */
  actions?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const secondary = columns.find((c) => c.secondary);
  const details = columns.filter(
    (c) => !c.primary && !c.secondary && !c.hideOnMobile
  );

  return (
    <div className={className}>
      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-xs font-medium text-muted-foreground",
                    column.align === "right" && "text-right"
                  )}
                >
                  {column.header}
                </th>
              ))}
              {actions ? <th className="w-px px-4 py-2.5" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b last:border-b-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-secondary/50"
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "px-4 py-3 align-middle",
                      column.align === "right" && "text-right tabular-nums",
                      column.className
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                {actions ? (
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {actions(row)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="grid gap-2.5 md:hidden">
        {rows.map((row) => (
          <div
            key={getRowId(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-xl border bg-card p-3.5",
              onRowClick && "cursor-pointer active:bg-secondary/50"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{primary.cell(row)}</div>
                {secondary ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {secondary.cell(row)}
                  </div>
                ) : null}
              </div>
            </div>
            {details.length > 0 ? (
              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {details.map((column) => (
                  <div key={column.id} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{column.header}</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {column.cell(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {actions ? (
              <div
                className="mt-3 flex flex-wrap gap-2 border-t pt-2.5"
                onClick={(event) => event.stopPropagation()}
              >
                {actions(row)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
