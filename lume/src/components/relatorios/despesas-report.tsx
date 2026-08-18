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
import { Lock, Receipt, TrendingDown, Wallet } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { Progress } from "@/components/ui/progress";
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
import { expensesByCategory, filterSales, summarize } from "@/lib/metrics";
import { EXPENSE_LABELS, type ExpenseCategory } from "@/lib/types";

interface ExpenseRow {
  category: string;
  label: string;
  value: number;
  previous: number;
  share: number;
}

function labelOf(category: string): string {
  return EXPENSE_LABELS[category as ExpenseCategory] ?? category;
}

/** Despesas por categoria, com peso no total e comparação com o período anterior. */
export function DespesasReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const current = expensesByCategory(ctx.state, ctx.range);
    const previous = new Map(
      expensesByCategory(ctx.state, ctx.previousRange).map((item) => [
        item.name,
        item.value,
      ])
    );
    const total = current.reduce((sum, item) => sum + item.value, 0);
    const previousTotal = [...previous.values()].reduce(
      (sum, value) => sum + value,
      0
    );

    const inRange = ctx.state.expenses.filter((expense) => {
      const time = new Date(expense.date).getTime();
      return time >= ctx.range.from.getTime() && time < ctx.range.to.getTime();
    });
    const fixed = inRange
      .filter((expense) => expense.isFixed)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const rows: ExpenseRow[] = current.map((item) => ({
      category: item.name,
      label: labelOf(item.name),
      value: item.value,
      previous: previous.get(item.name) ?? 0,
      share: total > 0 ? (item.value / total) * 100 : 0,
    }));

    const revenue = summarize(filterSales(ctx.state, ctx.range)).revenue;

    return {
      rows,
      total,
      previousTotal,
      fixed,
      variable: total - fixed,
      entries: inRange.length,
      revenue,
    };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  if (data.rows.length === 0) {
    return (
      <ReportEmpty
        description={`Nenhuma despesa lançada em ${ctx.periodLabel.toLowerCase()}.`}
      />
    );
  }

  const chartData = data.rows.slice(0, 8).map((row) => ({
    name: row.label,
    value: Math.round(row.value),
  }));
  const chartHeight = Math.max(200, chartData.length * 36);
  const biggest = data.rows[0];
  const expenseShare = data.revenue > 0 ? (data.total / data.revenue) * 100 : 0;
  const fixedShare = data.total > 0 ? (data.fixed / data.total) * 100 : 0;
  const worst = [...data.rows]
    .filter((row) => row.previous > 0)
    .sort(
      (a, b) => b.value - b.previous - (a.value - a.previous)
    )[0];

  const columns: Column<ExpenseRow>[] = [
    {
      id: "label",
      header: "Categoria",
      primary: true,
      cell: (row) => <span className="font-medium">{row.label}</span>,
    },
    {
      id: "value",
      header: "Valor",
      align: "right",
      cell: (row) => <span className="font-medium">{formatBRL(row.value)}</span>,
    },
    {
      id: "share",
      header: "% do total",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Progress value={row.share} className="w-16" />
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatPercent(row.share, 1)}
          </span>
        </div>
      ),
    },
    {
      id: "previous",
      header: "Período anterior",
      align: "right",
      cell: (row) => formatBRL(row.previous),
    },
    {
      id: "delta",
      header: "Variação",
      align: "right",
      cell: (row) => (
        <DeltaTag current={row.value} previous={row.previous} invertDelta />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportTotals>
        <ReportStat
          ctx={ctx}
          label="Despesas do período"
          value={formatBRL(data.total)}
          current={data.total}
          previous={data.previousTotal}
          icon={Receipt}
          invertDelta
          hint={`${formatNumber(data.entries)} lançamentos no período.`}
        />
        <ReportStat
          ctx={ctx}
          label="Maior categoria"
          value={formatBRL(biggest.value)}
          icon={TrendingDown}
          hint={`${biggest.label} responde por ${formatPercent(biggest.share, 1)} das despesas.`}
        />
        <ReportStat
          ctx={ctx}
          label="Custos fixos"
          value={formatBRL(data.fixed)}
          icon={Lock}
          hint="Despesas recorrentes que existem mesmo em mês fraco de vendas."
        />
        <ReportStat
          ctx={ctx}
          label="Despesa / faturamento"
          value={data.revenue > 0 ? formatPercent(expenseShare, 1) : "—"}
          icon={Wallet}
          invertDelta
          hint="Quanto do que a loja vendeu foi consumido pela estrutura."
        />
      </ReportTotals>

      <ReportCard
        title="Despesas por categoria"
        description="Maiores categorias do período selecionado"
      >
        <div
          style={{ height: chartHeight }}
          role="img"
          aria-label="Gráfico de barras das despesas por categoria"
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
                width={120}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{
                  fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                }}
                content={<ChartTooltip nameMap={{ value: "Despesa" }} />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill="var(--chart-2)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>

      <ReportInsight>
        {`${biggest.label} é a maior despesa do período, com ${formatBRL(biggest.value)} (${formatPercent(biggest.share, 1)} do total).`}{" "}
        <strong>{formatPercent(fixedShare, 1)}</strong> das despesas são fixas —{" "}
        {fixedShare > 60
          ? "estrutura pesada: em mês de venda fraca o resultado sofre rápido."
          : "boa flexibilidade: parte relevante das despesas acompanha o volume de vendas."}{" "}
        {worst && worst.value > worst.previous
          ? `${worst.label} foi quem mais subiu contra o período anterior (${formatBRL(worst.value - worst.previous)} a mais) — vale entender o motivo.`
          : "Nenhuma categoria teve alta relevante contra o período anterior."}
      </ReportInsight>

      <ReportCard
        title="Detalhamento por categoria"
        description="Sempre comparado com o período imediatamente anterior"
      >
        <DataTable
          rows={data.rows}
          columns={columns}
          getRowId={(row) => row.category}
        />
      </ReportCard>
    </div>
  );
}
