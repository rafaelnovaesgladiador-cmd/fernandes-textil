"use client";

import { useMemo, useState } from "react";
import { PartyPopper } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import type { ProductStockAnalysis } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { LIQUIDATION_DISCOUNT, liquidationPrice } from "./stock-meta";

type BandKey = "30" | "60" | "90" | "120";

const BANDS: Array<{
  key: BandKey;
  label: string;
  min: number;
  max: number;
  tone: string;
}> = [
  { key: "30", label: "30 a 59 dias", min: 30, max: 59, tone: "text-muted-foreground" },
  { key: "60", label: "60 a 89 dias", min: 60, max: 89, tone: "text-warning" },
  { key: "90", label: "90 a 119 dias", min: 90, max: 119, tone: "text-serious" },
  { key: "120", label: "120 dias ou mais", min: 120, max: Infinity, tone: "text-critical" },
];

interface StalledRow {
  analysis: ProductStockAnalysis;
  currentPrice: number;
  suggestedPrice: number;
  recovers: number;
}

/** Produtos parados: quanto capital está imobilizado e como destravá-lo. */
export function ParadosCard({
  analysis,
  className,
}: {
  analysis: ProductStockAnalysis[];
  className?: string;
}) {
  const [band, setBand] = useState<BandKey | null>(null);
  const [showAll, setShowAll] = useState(false);

  const all = useMemo<StalledRow[]>(
    () =>
      analysis
        .filter((item) => item.stock > 0 && item.daysSinceLastSale >= 30)
        .map((item) => {
          const currentPrice = item.product.promoPrice ?? item.product.price;
          const suggestedPrice = liquidationPrice(item.product);
          return {
            analysis: item,
            currentPrice,
            suggestedPrice,
            recovers: suggestedPrice * item.stock,
          };
        })
        .sort((a, b) => b.analysis.stockCost - a.analysis.stockCost),
    [analysis]
  );

  const bands = useMemo(
    () =>
      BANDS.map((definition) => {
        const list = all.filter(
          (row) =>
            row.analysis.daysSinceLastSale >= definition.min &&
            row.analysis.daysSinceLastSale <= definition.max
        );
        return {
          ...definition,
          count: list.length,
          value: list.reduce((sum, row) => sum + row.analysis.stockCost, 0),
        };
      }),
    [all]
  );

  const filtered = useMemo(() => {
    if (!band) return all;
    const definition = BANDS.find((item) => item.key === band)!;
    return all.filter(
      (row) =>
        row.analysis.daysSinceLastSale >= definition.min &&
        row.analysis.daysSinceLastSale <= definition.max
    );
  }, [all, band]);

  const visible = showAll ? filtered : filtered.slice(0, 10);

  const stalled = all.filter((row) => row.analysis.daysSinceLastSale > 90);
  const stalledValue = stalled.reduce(
    (sum, row) => sum + row.analysis.stockCost,
    0
  );
  const stalledRecovery = stalled.reduce((sum, row) => sum + row.recovers, 0);
  const totalStockCost = analysis.reduce((sum, item) => sum + item.stockCost, 0);
  const stalledShare =
    totalStockCost > 0 ? (stalledValue / totalStockCost) * 100 : 0;

  const columns: Column<StalledRow>[] = [
    {
      id: "produto",
      header: "Produto",
      primary: true,
      cell: (row) => (
        <span className="font-medium">{row.analysis.product.name}</span>
      ),
    },
    {
      id: "contexto",
      header: "Categoria",
      secondary: true,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.analysis.product.category} · sem vender há{" "}
          {formatNumber(row.analysis.daysSinceLastSale)} dias
        </span>
      ),
    },
    {
      id: "estoque",
      header: "Peças",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums">{formatNumber(row.analysis.stock)}</span>
      ),
    },
    {
      id: "custo",
      header: "Custo parado",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums">{formatBRL(row.analysis.stockCost)}</span>
      ),
    },
    {
      id: "preco",
      header: "Preço hoje",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground line-through">
          {formatBRL(row.currentPrice)}
        </span>
      ),
    },
    {
      id: "sugerido",
      header: `Sugerido (-${formatPercent(LIQUIDATION_DISCOUNT * 100)})`,
      align: "right",
      cell: (row) => (
        <Badge variant="accent">{formatBRL(row.suggestedPrice)}</Badge>
      ),
    },
    {
      id: "recupera",
      header: "Recupera",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums">{formatBRL(row.recovers)}</span>
      ),
    },
  ];

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Produtos parados e capital imobilizado</CardTitle>
        <CardDescription>
          Quanto tempo faz que cada produto não vende e quanto dinheiro está
          preso nele.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {bands.map((item) => {
            const active = band === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setBand(active ? null : item.key);
                  setShowAll(false);
                }}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 text-left transition-colors",
                  "outline-none hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring/50",
                  active && "ring-2 ring-primary"
                )}
              >
                <p className={cn("text-xs font-medium", item.tone)}>{item.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatBRL(item.value)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(item.count)}{" "}
                  {item.count === 1 ? "produto" : "produtos"}
                </p>
              </button>
            );
          })}
        </div>

        <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
          {stalled.length === 0 ? (
            "Nenhum produto está há mais de 90 dias sem vender — o estoque inteiro está girando."
          ) : (
            <>
              <strong className="text-foreground">
                {formatBRL(stalledValue)}
              </strong>{" "}
              estão imobilizados em {formatNumber(stalled.length)} produtos sem
              venda há mais de 90 dias — {formatPercent(stalledShare)} de todo o
              dinheiro investido no estoque. Liquidando com{" "}
              {formatPercent(LIQUIDATION_DISCOUNT * 100)} de desconto, a loja
              recuperaria cerca de{" "}
              <strong className="text-foreground">
                {formatBRL(stalledRecovery)}
              </strong>{" "}
              para comprar o que realmente gira.
            </>
          )}
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="Nada parado nesta faixa"
            description="Todos os produtos desta faixa venderam recentemente."
            action={
              band ? (
                <Button variant="outline" size="sm" onClick={() => setBand(null)}>
                  Ver todas as faixas
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Mostrando {formatNumber(visible.length)} de{" "}
              {formatNumber(filtered.length)} produtos
              {band
                ? ` na faixa de ${BANDS.find((item) => item.key === band)?.label}`
                : " sem venda há 30 dias ou mais"}
              , do maior capital parado para o menor.
            </p>
            <DataTable
              rows={visible}
              columns={columns}
              getRowId={(row) => row.analysis.product.id}
            />
            {filtered.length > visible.length || showAll ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll((current) => !current)}
              >
                {showAll
                  ? "Mostrar menos"
                  : `Mostrar todos (${formatNumber(filtered.length)})`}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
