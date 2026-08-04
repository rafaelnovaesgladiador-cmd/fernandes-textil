"use client";

import { Package } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { ProductVariant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { compareSizes } from "./product-common";

export function ProductVariantsTab({
  variants,
  onAdjust,
}: {
  variants: ProductVariant[];
  onAdjust: (variantId: string) => void;
}) {
  const rows = [...variants].sort(
    (a, b) => a.color.localeCompare(b.color) || compareSizes(a.size, b.size)
  );

  const columns: Column<ProductVariant>[] = [
    {
      id: "cor",
      header: "Cor",
      primary: true,
      cell: (row) => <span className="font-medium">{row.color}</span>,
    },
    {
      id: "tamanho",
      header: "Tamanho",
      cell: (row) => <Badge variant="secondary">{row.size}</Badge>,
    },
    {
      id: "sku",
      header: "SKU",
      secondary: true,
      cell: (row) => <span className="font-mono text-xs">{row.sku}</span>,
    },
    {
      id: "barcode",
      header: "Código de barras",
      hideOnMobile: true,
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.barcode}
        </span>
      ),
    },
    {
      id: "estoque",
      header: "Estoque",
      align: "right",
      cell: (row) => (
        <span
          className={cn(
            "tabular-nums",
            row.stock === 0
              ? "font-medium text-critical"
              : row.stock < row.minStock
                ? "font-medium text-[#8a6100] dark:text-warning"
                : undefined
          )}
        >
          {formatNumber(row.stock)}
          <span className="text-muted-foreground"> / mín. {row.minStock}</span>
        </span>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      actions={(row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAdjust(row.id)}
          aria-label={`Ajustar estoque de ${row.color} ${row.size}`}
        >
          <Package /> Ajustar
        </Button>
      )}
      emptyState={
        <EmptyState
          icon={Package}
          title="Sem variações cadastradas"
          description="Este produto não tem grade de cor e tamanho registrada."
        />
      }
    />
  );
}
