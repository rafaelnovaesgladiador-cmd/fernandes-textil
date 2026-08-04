"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL, formatBRLCompact, formatNumber, formatPercent } from "@/lib/format";
import type { ProductStockAnalysis } from "@/lib/metrics";

const CLASS_COLOR: Record<string, string> = {
  A: "var(--chart-1)",
  B: "var(--chart-3)",
  C: "var(--chart-4)",
};

const CLASS_DESCRIPTION: Record<string, string> = {
  A: "Puxam o faturamento",
  B: "Giro intermediário",
  C: "Giro baixo",
};

interface ClassRow {
  abcClass: "A" | "B" | "C";
  products: number;
  revenue: number;
  stockCost: number;
  pieces: number;
  catalogShare: number;
  revenueShare: number;
}

/** Curva ABC: onde o faturamento realmente nasce dentro do catálogo. */
export function CurvaAbcCard({ analysis }: { analysis: ProductStockAnalysis[] }) {
  const rows = useMemo<ClassRow[]>(() => {
    const totalRevenue = analysis.reduce((sum, item) => sum + item.revenue90, 0);
    const total = analysis.length;
    return (["A", "B", "C"] as const).map((abcClass) => {
      const list = analysis.filter((item) => item.abcClass === abcClass);
      const revenue = list.reduce((sum, item) => sum + item.revenue90, 0);
      return {
        abcClass,
        products: list.length,
        revenue,
        stockCost: list.reduce((sum, item) => sum + item.stockCost, 0),
        pieces: list.reduce((sum, item) => sum + item.stock, 0),
        catalogShare: total > 0 ? (list.length / total) * 100 : 0,
        revenueShare: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      };
    });
  }, [analysis]);

  const classA = rows[0];
  const classC = rows[2];

  const chartData = rows.map((row) => ({
    name: `Classe ${row.abcClass}`,
    value: Math.round(row.revenue),
    abcClass: row.abcClass,
  }));

  const columns: Column<ClassRow>[] = [
    {
      id: "classe",
      header: "Classe",
      primary: true,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ background: CLASS_COLOR[row.abcClass] }}
            aria-hidden
          />
          <span className="font-medium">Classe {row.abcClass}</span>
        </span>
      ),
    },
    {
      id: "papel",
      header: "Papel na loja",
      secondary: true,
      cell: (row) => (
        <span className="text-muted-foreground">
          {CLASS_DESCRIPTION[row.abcClass]}
        </span>
      ),
    },
    {
      id: "produtos",
      header: "Produtos",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums">
          {formatNumber(row.products)}{" "}
          <span className="text-muted-foreground">
            ({formatPercent(row.catalogShare)})
          </span>
        </span>
      ),
    },
    {
      id: "faturamento",
      header: "Faturamento 90 dias",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums">{formatBRL(row.revenue)}</span>
      ),
    },
    {
      id: "share",
      header: "% do faturamento",
      align: "right",
      cell: (row) => (
        <Badge
          variant={
            row.abcClass === "A"
              ? "success"
              : row.abcClass === "B"
                ? "accent"
                : "secondary"
          }
        >
          {formatPercent(row.revenueShare, 1)}
        </Badge>
      ),
    },
    {
      id: "custo",
      header: "Custo parado",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {formatBRL(row.stockCost)}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curva ABC dos produtos</CardTitle>
        <CardDescription>
          Faturamento dos últimos 90 dias: A concentra até 80% do total, B vai
          até 95% e C é a cauda longa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="h-48"
          role="img"
          aria-label="Gráfico de faturamento por classe da curva ABC"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              barSize={48}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(value: number) => formatBRLCompact(value)}
              />
              <Tooltip
                cursor={{
                  fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                }}
                content={<ChartTooltip nameMap={{ value: "Faturamento 90 dias" }} />}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.abcClass} fill={CLASS_COLOR[entry.abcClass]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.abcClass}
        />

        <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
          {classA.products === 0 ? (
            "Ainda não há vendas suficientes nos últimos 90 dias para montar a curva ABC."
          ) : (
            <>
              Os produtos <strong className="text-foreground">classe A</strong> são{" "}
              {formatPercent(classA.catalogShare)} do catálogo (
              {formatNumber(classA.products)}{" "}
              {classA.products === 1 ? "produto" : "produtos"}) e respondem por{" "}
              {formatPercent(classA.revenueShare)} do faturamento — são as peças
              que não podem faltar na arara. Já a{" "}
              <strong className="text-foreground">classe C</strong> ocupa{" "}
              {formatBRL(classC.stockCost)} em custo para gerar apenas{" "}
              {formatPercent(classC.revenueShare, 1)} do que a loja vende.
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
