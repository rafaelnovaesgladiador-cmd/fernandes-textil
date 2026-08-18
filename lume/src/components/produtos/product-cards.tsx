"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import {
  MarginText,
  PriceLabel,
  ProductStatusBadge,
  StockBadge,
  type ProductRow,
} from "./product-common";

/** Grade de cartões — visual de catálogo, complementar à visão em tabela. */
export function ProductCards({
  rows,
  onOpen,
  actions,
}: {
  rows: ProductRow[];
  onOpen: (row: ProductRow) => void;
  actions: (row: ProductRow) => React.ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <Card key={row.product.id} className="flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm cursor-pointer"
            >
              <p className="truncate text-sm font-medium">{row.product.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {row.product.category} · {row.product.sku}
              </p>
            </button>
            <div onClick={(event) => event.stopPropagation()}>
              {actions(row)}
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <PriceLabel product={row.product} className="text-base" />
            <MarginText margin={row.margin} className="text-xs" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
            <ProductStatusBadge status={row.product.status} />
            <StockBadge
              stock={row.stock}
              minStock={row.product.minStock}
            />
            <Badge variant="outline">{row.product.collection}</Badge>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {formatNumber(row.variants.length)}{" "}
            {row.variants.length === 1 ? "variação" : "variações"} ·{" "}
            {row.product.stockLocation}
          </p>
        </Card>
      ))}
    </div>
  );
}
