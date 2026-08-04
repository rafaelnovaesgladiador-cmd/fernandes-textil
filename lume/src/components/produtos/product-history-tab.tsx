"use client";

import { History } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { ProductVariant, StockMovement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MOVEMENT_LABELS } from "./product-common";

/** Entradas somam, saídas subtraem — a cor reforça a leitura rápida. */
const POSITIVE_TYPES = new Set(["entrada", "devolucao"]);

export function ProductHistoryTab({
  movements,
  variants,
}: {
  movements: StockMovement[];
  variants: ProductVariant[];
}) {
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const rows = [...movements].sort((a, b) => b.date.localeCompare(a.date));

  const columns: Column<StockMovement>[] = [
    {
      id: "tipo",
      header: "Tipo",
      primary: true,
      cell: (row) => (
        <Badge
          variant={
            POSITIVE_TYPES.has(row.type)
              ? "success"
              : row.type === "perda" || row.type === "avaria"
                ? "critical"
                : "secondary"
          }
        >
          {MOVEMENT_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      id: "variacao",
      header: "Variação",
      secondary: true,
      cell: (row) => {
        const variant = variantById.get(row.variantId);
        return variant ? `${variant.color} · ${variant.size}` : row.variantId;
      },
    },
    {
      id: "quantidade",
      header: "Quantidade",
      align: "right",
      cell: (row) => (
        <span
          className={cn(
            "font-medium tabular-nums",
            row.quantity > 0 ? "text-success-text" : "text-critical"
          )}
        >
          {row.quantity > 0 ? "+" : ""}
          {row.quantity}
        </span>
      ),
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: (row) => <span className="text-sm">{row.reason}</span>,
    },
    {
      id: "data",
      header: "Data",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.date)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      emptyState={
        <EmptyState
          icon={History}
          title="Sem movimentações registradas"
          description="Vendas, ajustes e recebimentos deste produto aparecem aqui."
        />
      }
    />
  );
}
