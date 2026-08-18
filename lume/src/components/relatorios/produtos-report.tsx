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
import { CircleDollarSign, Percent, Shirt, TrendingUp } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  DeltaTag,
  ReportCard,
  ReportEmpty,
  ReportInsight,
  ReportStat,
  ReportTotals,
  type ReportProps,
} from "@/components/relatorios/report-shell";
import {
  formatBRL,
  formatBRLCompact,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { filterSales, productPerformance } from "@/lib/metrics";

interface ProductRow {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  profit: number;
  margin: number;
  previousRevenue: number;
}

/** Ranking de produtos por faturamento, com lucro e margem. */
export function ProdutosReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const sales = filterSales(ctx.state, ctx.range);
    const previousSales = filterSales(ctx.state, ctx.previousRange);
    const previous = new Map(
      productPerformance(ctx.state, previousSales).map((row) => [
        row.productId,
        row,
      ])
    );

    const rows: ProductRow[] = productPerformance(ctx.state, sales).map((row) => ({
      productId: row.productId,
      name: row.name,
      category: row.category,
      quantity: row.quantity,
      revenue: row.revenue,
      profit: row.profit,
      margin: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0,
      previousRevenue: previous.get(row.productId)?.revenue ?? 0,
    }));

    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const profit = rows.reduce((sum, row) => sum + row.profit, 0);
    const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    const previousRows = [...previous.values()];
    const previousRevenue = previousRows.reduce((sum, row) => sum + row.revenue, 0);
    const previousProfit = previousRows.reduce((sum, row) => sum + row.profit, 0);
    const previousQuantity = previousRows.reduce(
      (sum, row) => sum + row.quantity,
      0
    );
    const top5 = rows.slice(0, 5).reduce((sum, row) => sum + row.revenue, 0);

    return {
      rows,
      revenue,
      profit,
      quantity,
      previousRevenue,
      previousProfit,
      previousQuantity,
      previousCount: previousRows.length,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      previousMargin:
        previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0,
      top5Share: revenue > 0 ? (top5 / revenue) * 100 : 0,
    };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  if (data.rows.length === 0) {
    return (
      <ReportEmpty
        description={`Nenhum produto vendido em ${ctx.periodLabel.toLowerCase()}. Escolha outro período para ver o ranking.`}
      />
    );
  }

  const chartData = data.rows.slice(0, 8).map((row) => ({
    name: row.name.length > 22 ? `${row.name.slice(0, 21)}…` : row.name,
    value: Math.round(row.revenue),
  }));
  const chartHeight = Math.max(200, chartData.length * 38);

  const bestMargin = [...data.rows]
    .filter((row) => row.revenue > 0)
    .sort((a, b) => b.margin - a.margin)[0];
  const worstMargin = [...data.rows]
    .filter((row) => row.revenue > 0)
    .sort((a, b) => a.margin - b.margin)[0];

  const columns: Column<ProductRow>[] = [
    {
      id: "name",
      header: "Produto",
      primary: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "category",
      header: "Categoria",
      secondary: true,
      cell: (row) => <Badge variant="secondary">{row.category}</Badge>,
    },
    {
      id: "quantity",
      header: "Qtd",
      align: "right",
      cell: (row) => formatNumber(row.quantity),
    },
    {
      id: "revenue",
      header: "Receita",
      align: "right",
      cell: (row) => <span className="font-medium">{formatBRL(row.revenue)}</span>,
    },
    {
      id: "profit",
      header: "Lucro",
      align: "right",
      cell: (row) => formatBRL(row.profit),
    },
    {
      id: "margin",
      header: "Margem",
      align: "right",
      cell: (row) => (
        <span
          className={row.margin < 40 ? "text-critical" : undefined}
        >
          {formatPercent(row.margin, 1)}
        </span>
      ),
    },
  ];

  if (ctx.compare) {
    columns.push({
      id: "delta",
      header: "vs. anterior",
      align: "right",
      cell: (row) => (
        <DeltaTag current={row.revenue} previous={row.previousRevenue} />
      ),
    });
  }

  return (
    <div className="space-y-4">
      <ReportTotals>
        <ReportStat
          ctx={ctx}
          label="Receita de produtos"
          value={formatBRL(data.revenue)}
          current={data.revenue}
          previous={data.previousRevenue}
          icon={CircleDollarSign}
          hint="Soma do preço praticado por item, antes do desconto do total da venda."
        />
        <ReportStat
          ctx={ctx}
          label="Lucro bruto"
          value={formatBRL(data.profit)}
          current={data.profit}
          previous={data.previousProfit}
          icon={TrendingUp}
        />
        <ReportStat
          ctx={ctx}
          label="Margem média"
          value={formatPercent(data.margin, 1)}
          current={data.margin}
          previous={data.previousMargin}
          icon={Percent}
        />
        <ReportStat
          ctx={ctx}
          label="Peças vendidas"
          value={formatNumber(data.quantity)}
          current={data.quantity}
          previous={data.previousQuantity}
          icon={Shirt}
          hint={`${formatNumber(data.rows.length)} produtos diferentes tiveram saída no período.`}
        />
      </ReportTotals>

      <ReportCard
        title="Top 8 por faturamento"
        description="Os produtos que mais pesam na receita do período"
      >
        <div
          style={{ height: chartHeight }}
          role="img"
          aria-label="Gráfico de barras dos produtos com maior faturamento"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
              barSize={16}
            >
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(value: number) => formatBRLCompact(value)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{
                  fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                }}
                content={<ChartTooltip nameMap={{ value: "Faturamento" }} />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill="var(--chart-1)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>

      <ReportInsight>
        Os 5 produtos do topo respondem por{" "}
        <strong>{formatPercent(data.top5Share, 1)}</strong> do faturamento —{" "}
        {data.top5Share > 50
          ? "a receita está concentrada em poucas peças: garanta a reposição delas antes de comprar novidades."
          : "a receita está bem distribuída pelo catálogo, o que reduz o risco de ruptura."}{" "}
        {bestMargin && worstMargin && bestMargin.productId !== worstMargin.productId ? (
          <>
            {`A maior margem é de ${bestMargin.name} (${formatPercent(bestMargin.margin, 1)}) e a menor é de ${worstMargin.name} (${formatPercent(worstMargin.margin, 1)}) — vale revisar preço ou custo do segundo.`}
          </>
        ) : null}
      </ReportInsight>

      <ReportCard
        title="Ranking completo"
        description="Ordenado por faturamento no período"
      >
        <DataTable
          rows={data.rows}
          columns={columns}
          getRowId={(row) => row.productId}
        />
      </ReportCard>
    </div>
  );
}
