"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatNumber } from "@/lib/format";
import type { ProductPerformance } from "@/lib/metrics";

/** Produtos mais vendidos, com barra proporcional e lucro gerado. */
export function TopProductsCard({ data }: { data: ProductPerformance[] }) {
  const max = Math.max(...data.map((p) => p.revenue), 1);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Produtos mais vendidos</CardTitle>
          <CardDescription>Por faturamento no período</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/produtos">Ver produtos</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {data.map((product) => (
          <div key={product.productId}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-sm">{product.name}</p>
              <p className="shrink-0 text-sm font-medium tabular-nums">
                {formatBRL(product.revenue)}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(product.revenue / max) * 100}%`,
                    background: "var(--chart-1)",
                  }}
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatNumber(product.quantity)} un. · lucro {formatBRL(product.profit)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
