"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CircleDollarSign, ShoppingBag, Shirt, TicketPercent } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import {
  ReportCard,
  ReportEmpty,
  ReportInsight,
  ReportStat,
  ReportTotals,
  type ReportProps,
} from "@/components/relatorios/report-shell";
import { addDays, dayKey } from "@/lib/dates";
import {
  formatBRL,
  formatBRLCompact,
  formatDate,
  formatDayMonth,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { filterSales, isRevenueSale, summarize } from "@/lib/metrics";

interface DayRow {
  key: string;
  date: Date;
  revenue: number;
  salesCount: number;
  pieces: number;
  ticket: number;
}

/** Vendas por dia: faturamento, volume, ticket médio e peças. */
export function VendasReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const sales = filterSales(ctx.state, ctx.range);
    const previous = filterSales(ctx.state, ctx.previousRange);

    const buckets = new Map<string, DayRow>();
    for (
      let cursor = ctx.range.from;
      cursor.getTime() < ctx.range.to.getTime();
      cursor = addDays(cursor, 1)
    ) {
      buckets.set(dayKey(cursor), {
        key: dayKey(cursor),
        date: cursor,
        revenue: 0,
        salesCount: 0,
        pieces: 0,
        ticket: 0,
      });
    }
    for (const sale of sales) {
      if (!isRevenueSale(sale)) continue;
      const bucket = buckets.get(dayKey(sale.date));
      if (!bucket) continue;
      bucket.revenue += sale.total;
      bucket.salesCount += 1;
      bucket.pieces += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    const days = [...buckets.values()].map((day) => ({
      ...day,
      ticket: day.salesCount > 0 ? day.revenue / day.salesCount : 0,
    }));

    const withSales = days.filter((day) => day.salesCount > 0);
    const best = [...withSales].sort((a, b) => b.revenue - a.revenue)[0];

    return {
      days,
      withSales,
      best,
      summary: summarize(sales),
      previousSummary: summarize(previous),
    };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  if (data.summary.salesCount === 0) {
    return (
      <ReportEmpty description={`Nenhuma venda finalizada em ${ctx.periodLabel.toLowerCase()}. Escolha outro período para ver o relatório.`} />
    );
  }

  const { summary, previousSummary, best, withSales } = data;
  const dailyAverage = withSales.length > 0 ? summary.revenue / withSales.length : 0;
  const bestShare = best && summary.revenue > 0 ? (best.revenue / summary.revenue) * 100 : 0;

  const chartData = data.days.map((day) => ({
    label: formatDayMonth(day.date),
    faturamento: Math.round(day.revenue),
    ticket: Math.round(day.ticket),
  }));
  const tickInterval = Math.max(0, Math.ceil(chartData.length / 8) - 1);

  const columns: Column<DayRow>[] = [
    {
      id: "day",
      header: "Dia",
      primary: true,
      cell: (row) => formatDate(row.date),
    },
    {
      id: "revenue",
      header: "Faturamento",
      align: "right",
      cell: (row) => <span className="font-medium">{formatBRL(row.revenue)}</span>,
    },
    {
      id: "count",
      header: "Vendas",
      align: "right",
      cell: (row) => formatNumber(row.salesCount),
    },
    {
      id: "ticket",
      header: "Ticket médio",
      align: "right",
      cell: (row) => (row.salesCount > 0 ? formatBRL(row.ticket) : "—"),
    },
    {
      id: "pieces",
      header: "Peças",
      align: "right",
      cell: (row) => formatNumber(row.pieces),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportTotals>
        <ReportStat
          ctx={ctx}
          label="Faturamento"
          value={formatBRL(summary.revenue)}
          current={summary.revenue}
          previous={previousSummary.revenue}
          icon={CircleDollarSign}
        />
        <ReportStat
          ctx={ctx}
          label="Vendas"
          value={formatNumber(summary.salesCount)}
          current={summary.salesCount}
          previous={previousSummary.salesCount}
          icon={ShoppingBag}
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
          label="Peças vendidas"
          value={formatNumber(summary.pieces)}
          current={summary.pieces}
          previous={previousSummary.pieces}
          icon={Shirt}
        />
      </ReportTotals>

      <ReportCard
        title="Evolução diária"
        description="Faturamento e ticket médio por dia do período"
      >
        <div
          className="h-64"
          role="img"
          aria-label="Gráfico de linha do faturamento por dia"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id="vendasFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                interval={tickInterval}
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
                  stroke: "var(--muted-foreground)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                content={
                  <ChartTooltip
                    nameMap={{ faturamento: "Faturamento", ticket: "Ticket médio" }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="faturamento"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#vendasFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="ticket"
                stroke="var(--chart-4)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: "var(--chart-1)" }}
              aria-hidden
            />
            Faturamento
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: "var(--chart-4)" }}
              aria-hidden
            />
            Ticket médio
          </span>
        </div>
      </ReportCard>

      <ReportInsight>
        {best ? (
          <>
            A loja vendeu em {formatNumber(withSales.length)} dos{" "}
            {formatNumber(data.days.length)} dias do período, com média de{" "}
            <strong>{formatBRL(dailyAverage)}</strong> por dia com movimento. O melhor
            dia foi {formatDate(best.date)}, com {formatBRL(best.revenue)} —{" "}
            {formatPercent(bestShare, 1)} de todo o faturamento do período. Ticket médio
            de {formatBRL(summary.ticket)} e {formatNumber(summary.pieces)} peças
            indicam{" "}
            {summary.salesCount > 0 && summary.pieces / summary.salesCount >= 2
              ? "boa venda casada: mais de duas peças por atendimento."
              : "espaço para venda casada: menos de duas peças por atendimento."}
          </>
        ) : (
          "Sem dias com movimento neste período."
        )}
      </ReportInsight>

      <ReportCard
        title="Detalhamento por dia"
        description="Cada linha é um dia do período selecionado"
      >
        <DataTable
          rows={data.days}
          columns={columns}
          getRowId={(row) => row.key}
        />
      </ReportCard>
    </div>
  );
}
