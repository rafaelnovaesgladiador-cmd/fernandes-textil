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
import { CircleDollarSign, Percent, Receipt, Scale } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import {
  DeltaTag,
  ReportCard,
  ReportEmpty,
  ReportInsight,
  ReportStat,
  ReportTotals,
  type ReportProps,
} from "@/components/relatorios/report-shell";
import { formatBRL, formatBRLCompact, formatPercent } from "@/lib/format";
import { incomeStatement, type IncomeStatement } from "@/lib/metrics";
import { cn } from "@/lib/utils";

interface StatementRow {
  id: string;
  label: string;
  value: number;
  previous: number;
  kind: "receita" | "deducao" | "resultado";
  hint?: string;
}

function buildRows(
  current: IncomeStatement,
  previous: IncomeStatement
): StatementRow[] {
  return [
    {
      id: "bruta",
      label: "Receita bruta",
      value: current.grossRevenue,
      previous: previous.grossRevenue,
      kind: "receita",
      hint: "Vendas a preço cheio, antes dos descontos concedidos.",
    },
    {
      id: "descontos",
      label: "(−) Descontos concedidos",
      value: current.discounts,
      previous: previous.discounts,
      kind: "deducao",
    },
    {
      id: "liquida",
      label: "= Receita líquida",
      value: current.netRevenue,
      previous: previous.netRevenue,
      kind: "resultado",
    },
    {
      id: "cmv",
      label: "(−) Custo das mercadorias (CMV)",
      value: current.cogs,
      previous: previous.cogs,
      kind: "deducao",
    },
    {
      id: "bruto",
      label: "= Lucro bruto",
      value: current.grossProfit,
      previous: previous.grossProfit,
      kind: "resultado",
    },
    {
      id: "operacionais",
      label: "(−) Despesas operacionais",
      value: current.operatingExpenses,
      previous: previous.operatingExpenses,
      kind: "deducao",
      hint: "Aluguel, salários, energia, marketing e demais despesas do período.",
    },
    {
      id: "taxas",
      label: "(−) Taxas de cartão",
      value: current.cardFees,
      previous: previous.cardFees,
      kind: "deducao",
    },
    {
      id: "comissoes",
      label: "(−) Comissões",
      value: current.commissions,
      previous: previous.commissions,
      kind: "deducao",
    },
    {
      id: "impostos",
      label: "(−) Impostos",
      value: current.taxes,
      previous: previous.taxes,
      kind: "deducao",
    },
    {
      id: "resultado",
      label: "= Resultado do período",
      value: current.netProfit,
      previous: previous.netProfit,
      kind: "resultado",
    },
  ];
}

/** DRE simplificada: receitas, deduções e o resultado do período. */
export function FinanceiroReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const current = incomeStatement(ctx.state, ctx.range);
    const previous = incomeStatement(ctx.state, ctx.previousRange);
    const costs =
      current.cogs +
      current.operatingExpenses +
      current.cardFees +
      current.commissions +
      current.taxes;
    const previousCosts =
      previous.cogs +
      previous.operatingExpenses +
      previous.cardFees +
      previous.commissions +
      previous.taxes;
    return {
      current,
      previous,
      costs,
      previousCosts,
      rows: buildRows(current, previous),
    };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  const { current, previous } = data;

  if (current.netRevenue === 0 && data.costs === 0) {
    return (
      <ReportEmpty
        description={`Sem receitas ou despesas lançadas em ${ctx.periodLabel.toLowerCase()}.`}
      />
    );
  }

  const chartData = [
    { name: "Receita líquida", value: Math.round(current.netRevenue), tone: 0 },
    { name: "Custos e despesas", value: Math.round(data.costs), tone: 1 },
    { name: "Resultado", value: Math.round(current.netProfit), tone: 2 },
  ];
  const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

  const columns: Column<StatementRow>[] = [
    {
      id: "label",
      header: "Linha",
      primary: true,
      cell: (row) => (
        <span
          className={cn(
            row.kind === "resultado" && "font-semibold",
            row.kind === "deducao" && "text-muted-foreground"
          )}
        >
          {row.label}
        </span>
      ),
    },
    {
      id: "value",
      header: "Valor",
      align: "right",
      cell: (row) => (
        <span
          className={cn(
            "font-medium",
            row.id === "resultado" && row.value < 0 && "text-critical",
            row.id === "resultado" && row.value >= 0 && "text-success-text"
          )}
        >
          {formatBRL(row.value)}
        </span>
      ),
    },
    {
      id: "share",
      header: "% da receita líquida",
      align: "right",
      cell: (row) =>
        current.netRevenue > 0
          ? formatPercent((row.value / current.netRevenue) * 100, 1)
          : "—",
    },
  ];

  if (ctx.compare) {
    columns.push(
      {
        id: "previous",
        header: "Período anterior",
        align: "right",
        hideOnMobile: true,
        cell: (row) => formatBRL(row.previous),
      },
      {
        id: "delta",
        header: "Variação",
        align: "right",
        cell: (row) => (
          <DeltaTag
            current={row.value}
            previous={row.previous}
            invertDelta={row.kind === "deducao"}
          />
        ),
      }
    );
  }

  return (
    <div className="space-y-4">
      <ReportTotals>
        <ReportStat
          ctx={ctx}
          label="Receita líquida"
          value={formatBRL(current.netRevenue)}
          current={current.netRevenue}
          previous={previous.netRevenue}
          icon={CircleDollarSign}
        />
        <ReportStat
          ctx={ctx}
          label="Custos e despesas"
          value={formatBRL(data.costs)}
          current={data.costs}
          previous={data.previousCosts}
          icon={Receipt}
          invertDelta
          hint="CMV, despesas operacionais, taxas de cartão, comissões e impostos."
        />
        <ReportStat
          ctx={ctx}
          label="Resultado"
          value={formatBRL(current.netProfit)}
          current={current.netProfit}
          previous={previous.netProfit}
          icon={Scale}
        />
        <ReportStat
          ctx={ctx}
          label="Margem líquida"
          value={formatPercent(current.netMargin, 1)}
          current={current.netMargin}
          previous={previous.netMargin}
          icon={Percent}
        />
      </ReportTotals>

      <ReportCard
        title="Receitas × despesas"
        description="O que entrou, o que saiu e o que sobrou no período"
      >
        <div
          className="h-64"
          role="img"
          aria-label="Gráfico de barras comparando receita, despesas e resultado"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
              barSize={56}
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
                content={<ChartTooltip nameMap={{ value: "Valor" }} />}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={chartColors[entry.tone]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>

      <ReportInsight>
        De cada {formatBRL(100)} vendidos, sobram{" "}
        <strong>{formatBRL(current.netMargin)}</strong> de lucro líquido depois de
        custo da mercadoria, despesas, taxas, comissões e impostos.{" "}
        {current.netProfit >= 0
          ? `O período fechou positivo em ${formatBRL(current.netProfit)}.`
          : `O período fechou negativo em ${formatBRL(Math.abs(current.netProfit))}: o resultado não cobre a estrutura.`}{" "}
        O CMV consome{" "}
        {formatPercent(
          current.netRevenue > 0 ? (current.cogs / current.netRevenue) * 100 : 0,
          1
        )}{" "}
        da receita líquida e os descontos já retiraram {formatBRL(current.discounts)}{" "}
        do faturamento.
        {current.returns > 0
          ? ` Devoluções somaram ${formatBRL(current.returns)} e não entram na receita.`
          : ""}
      </ReportInsight>

      <ReportCard
        title="Demonstrativo do período"
        description="Da receita bruta ao resultado, linha a linha"
      >
        <DataTable rows={data.rows} columns={columns} getRowId={(row) => row.id} />
      </ReportCard>
    </div>
  );
}
