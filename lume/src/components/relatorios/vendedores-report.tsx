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
import { CircleDollarSign, HandCoins, Percent, TicketPercent } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import {
  DeltaTag,
  REPORT_COLORS,
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
import { filterSales, sellerPerformance, summarize } from "@/lib/metrics";
import type { SellerPerformance } from "@/lib/metrics";

interface SellerRow extends SellerPerformance {
  previousRevenue: number;
}

/** Comparativo de vendedoras: faturamento, margem, ticket e comissão. */
export function VendedoresReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const sales = filterSales(ctx.state, ctx.range);
    const previousSales = filterSales(ctx.state, ctx.previousRange);
    const previous = new Map(
      sellerPerformance(ctx.state, previousSales).map((row) => [
        row.seller.id,
        row,
      ])
    );

    const rows: SellerRow[] = sellerPerformance(ctx.state, sales)
      .map((row) => ({
        ...row,
        previousRevenue: previous.get(row.seller.id)?.revenue ?? 0,
      }))
      .filter((row) => row.salesCount > 0 || row.previousRevenue > 0);

    const summary = summarize(sales);
    const previousSummary = summarize(previousSales);
    const commission = rows.reduce((sum, row) => sum + row.commission, 0);
    const previousCommission = [...previous.values()].reduce(
      (sum, row) => sum + row.commission,
      0
    );

    return { rows, summary, previousSummary, commission, previousCommission };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  if (data.rows.length === 0 || data.summary.salesCount === 0) {
    return (
      <ReportEmpty
        description={`Nenhuma venda registrada em ${ctx.periodLabel.toLowerCase()} — sem base para comparar as vendedoras.`}
      />
    );
  }

  const { rows, summary, previousSummary } = data;
  const leader = rows[0];
  const last = rows[rows.length - 1];
  const commissionShare =
    summary.revenue > 0 ? (data.commission / summary.revenue) * 100 : 0;

  const chartData = rows.map((row) => ({
    name: row.seller.name.split(" ")[0],
    value: Math.round(row.revenue),
  }));

  const columns: Column<SellerRow>[] = [
    {
      id: "name",
      header: "Vendedora",
      primary: true,
      cell: (row) => <span className="font-medium">{row.seller.name}</span>,
    },
    {
      id: "sales",
      header: "Vendas",
      secondary: true,
      cell: (row) =>
        `${formatNumber(row.salesCount)} vendas · ${formatNumber(row.pieces)} peças`,
    },
    {
      id: "revenue",
      header: "Faturamento",
      align: "right",
      cell: (row) => <span className="font-medium">{formatBRL(row.revenue)}</span>,
    },
    {
      id: "ticket",
      header: "Ticket",
      align: "right",
      cell: (row) => formatBRL(row.ticket),
    },
    {
      id: "margin",
      header: "Margem",
      align: "right",
      cell: (row) => formatPercent(row.margin, 1),
    },
    {
      id: "discount",
      header: "Desconto médio",
      align: "right",
      cell: (row) => (
        <span className={row.discountAverage > 8 ? "text-critical" : undefined}>
          {formatPercent(row.discountAverage, 1)}
        </span>
      ),
    },
    {
      id: "commission",
      header: "Comissão",
      align: "right",
      cell: (row) => formatBRL(row.commission),
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
          label="Faturamento da equipe"
          value={formatBRL(summary.revenue)}
          current={summary.revenue}
          previous={previousSummary.revenue}
          icon={CircleDollarSign}
        />
        <ReportStat
          ctx={ctx}
          label="Comissões do período"
          value={formatBRL(data.commission)}
          current={data.commission}
          previous={data.previousCommission}
          icon={HandCoins}
          hint="Calculada pelo percentual da regra de cada vendedora sobre o que ela vendeu."
        />
        <ReportStat
          ctx={ctx}
          label="Ticket médio"
          value={formatBRL(summary.ticket)}
          current={summary.ticket}
          previous={previousSummary.ticket}
          icon={TicketPercent}
        />
        <ReportStat
          ctx={ctx}
          label="Margem bruta"
          value={formatPercent(summary.margin, 1)}
          current={summary.margin}
          previous={previousSummary.margin}
          icon={Percent}
        />
      </ReportTotals>

      <ReportCard
        title="Faturamento por vendedora"
        description="Comparativo do período selecionado"
      >
        <div
          className="h-64"
          role="img"
          aria-label="Gráfico de barras do faturamento por vendedora"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
              barSize={38}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                width={68}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(value: number) => formatBRLCompact(value)}
              />
              <Tooltip
                cursor={{
                  fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                }}
                content={<ChartTooltip nameMap={{ value: "Faturamento" }} />}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={REPORT_COLORS[index % REPORT_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>

      <ReportInsight>
        {`${leader.seller.name.split(" ")[0]} lidera com ${formatBRL(leader.revenue)} (${formatPercent(
          summary.revenue > 0 ? (leader.revenue / summary.revenue) * 100 : 0,
          1
        )} do total)`}
        {rows.length > 1 && last.revenue > 0
          ? `, ${formatBRL(leader.revenue - last.revenue)} à frente de ${last.seller.name.split(" ")[0]}`
          : ""}
        . As comissões somam {formatBRL(data.commission)}, ou{" "}
        <strong>{formatPercent(commissionShare, 1)}</strong> do faturamento.{" "}
        {rows.some((row) => row.discountAverage > 8)
          ? "Atenção ao desconto médio acima de 8% em parte da equipe: é margem saindo direto do resultado."
          : "O desconto médio da equipe está sob controle, preservando a margem."}
      </ReportInsight>

      <ReportCard
        title="Comparativo completo"
        description="Ordenado por faturamento no período"
      >
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.seller.id}
        />
      </ReportCard>
    </div>
  );
}
