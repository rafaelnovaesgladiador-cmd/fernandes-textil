"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CreditCard, CircleDollarSign, HandCoins, Percent } from "lucide-react";
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
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { filterSales, isRevenueSale } from "@/lib/metrics";
import { PAYMENT_LABELS, type PaymentMethod, type Sale } from "@/lib/types";

/**
 * Peso da taxa de cada meio sobre a taxa de crédito configurada.
 * Débito costuma custar bem menos que crédito; Pix, dinheiro e crediário não
 * têm taxa de adquirente.
 */
const FEE_FACTOR: Record<PaymentMethod, number> = {
  credito: 1,
  debito: 0.6,
  pix: 0,
  dinheiro: 0,
  crediario: 0,
};

interface PaymentRow {
  method: PaymentMethod;
  label: string;
  revenue: number;
  previousRevenue: number;
  salesCount: number;
  ticket: number;
  share: number;
  fee: number;
  net: number;
}

/** Composição do faturamento por meio de pagamento e custo das taxas. */
export function PagamentosReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const feePercent = ctx.state.settings.cardFeePercent;

    const aggregate = (sales: Sale[]) => {
      const totals = new Map<PaymentMethod, { revenue: number; count: number }>();
      for (const sale of sales) {
        if (!isRevenueSale(sale)) continue;
        const entry = totals.get(sale.paymentMethod) ?? { revenue: 0, count: 0 };
        entry.revenue += sale.total;
        entry.count += 1;
        totals.set(sale.paymentMethod, entry);
      }
      return totals;
    };

    const current = aggregate(filterSales(ctx.state, ctx.range));
    const previous = aggregate(filterSales(ctx.state, ctx.previousRange));
    const total = [...current.values()].reduce((sum, e) => sum + e.revenue, 0);
    const previousTotal = [...previous.values()].reduce(
      (sum, e) => sum + e.revenue,
      0
    );

    const rows: PaymentRow[] = [...current.entries()]
      .map(([method, entry]) => {
        const fee = entry.revenue * (feePercent / 100) * FEE_FACTOR[method];
        return {
          method,
          label: PAYMENT_LABELS[method],
          revenue: entry.revenue,
          previousRevenue: previous.get(method)?.revenue ?? 0,
          salesCount: entry.count,
          ticket: entry.count > 0 ? entry.revenue / entry.count : 0,
          share: total > 0 ? (entry.revenue / total) * 100 : 0,
          fee,
          net: entry.revenue - fee,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const fees = rows.reduce((sum, row) => sum + row.fee, 0);
    const previousFees = [...previous.entries()].reduce(
      (sum, [method, entry]) =>
        sum + entry.revenue * (feePercent / 100) * FEE_FACTOR[method],
      0
    );
    const cardRevenue = rows
      .filter((row) => row.method === "credito" || row.method === "debito")
      .reduce((sum, row) => sum + row.revenue, 0);
    const creditRevenue =
      rows.find((row) => row.method === "crediario")?.revenue ?? 0;

    return {
      rows,
      total,
      previousTotal,
      fees,
      previousFees,
      cardRevenue,
      creditRevenue,
      feePercent,
    };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  if (data.rows.length === 0) {
    return (
      <ReportEmpty
        description={`Nenhuma venda em ${ctx.periodLabel.toLowerCase()} — sem composição de pagamentos para exibir.`}
      />
    );
  }

  const chartData = data.rows.map((row) => ({
    name: row.label,
    value: Math.round(row.revenue),
  }));
  const leader = data.rows[0];
  const cardShare = data.total > 0 ? (data.cardRevenue / data.total) * 100 : 0;
  const creditShare =
    data.total > 0 ? (data.creditRevenue / data.total) * 100 : 0;

  const columns: Column<PaymentRow>[] = [
    {
      id: "label",
      header: "Meio de pagamento",
      primary: true,
      cell: (row) => <span className="font-medium">{row.label}</span>,
    },
    {
      id: "revenue",
      header: "Valor",
      align: "right",
      cell: (row) => <span className="font-medium">{formatBRL(row.revenue)}</span>,
    },
    {
      id: "share",
      header: "% do total",
      align: "right",
      cell: (row) => formatPercent(row.share, 1),
    },
    {
      id: "count",
      header: "Vendas",
      align: "right",
      cell: (row) => formatNumber(row.salesCount),
    },
    {
      id: "ticket",
      header: "Ticket",
      align: "right",
      cell: (row) => formatBRL(row.ticket),
    },
    {
      id: "fee",
      header: "Taxa estimada",
      align: "right",
      cell: (row) =>
        row.fee > 0 ? (
          <span className="text-critical">− {formatBRL(row.fee)}</span>
        ) : (
          "—"
        ),
    },
    {
      id: "net",
      header: "Líquido",
      align: "right",
      hideOnMobile: true,
      cell: (row) => formatBRL(row.net),
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
          label="Faturamento do período"
          value={formatBRL(data.total)}
          current={data.total}
          previous={data.previousTotal}
          icon={CircleDollarSign}
        />
        <ReportStat
          ctx={ctx}
          label="Participação do cartão"
          value={formatPercent(cardShare, 1)}
          icon={CreditCard}
          hint="Soma de crédito e débito sobre o faturamento do período."
        />
        <ReportStat
          ctx={ctx}
          label="Taxas de cartão estimadas"
          value={formatBRL(data.fees)}
          current={data.fees}
          previous={data.previousFees}
          icon={Percent}
          invertDelta
          hint={`Estimativa com a taxa de ${formatPercent(data.feePercent, 2)} configurada; débito considerado a 60% da taxa de crédito.`}
        />
        <ReportStat
          ctx={ctx}
          label="Crediário da loja"
          value={formatBRL(data.creditRevenue)}
          icon={HandCoins}
          hint="Vendas parceladas na própria loja — viram contas a receber."
        />
      </ReportTotals>

      <ReportCard
        title="Composição do faturamento"
        description="Como as clientes pagaram no período"
      >
        <div
          className="mx-auto h-48 w-48"
          role="img"
          aria-label="Gráfico de rosca da composição por meio de pagamento"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<ChartTooltip />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                strokeWidth={2}
                stroke="var(--card)"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={REPORT_COLORS[index % REPORT_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {chartData.map((entry, index) => (
            <li key={entry.name} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: REPORT_COLORS[index % REPORT_COLORS.length] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {entry.name}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatBRL(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </ReportCard>

      <ReportInsight>
        {leader.label} lidera com <strong>{formatPercent(leader.share, 1)}</strong>{" "}
        do faturamento. As taxas de cartão custam cerca de {formatBRL(data.fees)} no
        período —{" "}
        {data.total > 0
          ? formatPercent((data.fees / data.total) * 100, 2)
          : "0%"}{" "}
        do que entrou.{" "}
        {cardShare > 55
          ? "Com o cartão acima de 55% das vendas, negociar a taxa com a adquirente ou incentivar Pix tem impacto direto na margem."
          : "A dependência de cartão está moderada, o que protege a margem."}{" "}
        {creditShare > 10
          ? `O crediário responde por ${formatPercent(creditShare, 1)} das vendas: acompanhe de perto o contas a receber e a inadimplência.`
          : "O crediário tem peso pequeno, então o risco de inadimplência é baixo."}
      </ReportInsight>

      <ReportCard
        title="Detalhamento por meio"
        description="Valor bruto, taxa estimada e líquido"
      >
        <DataTable
          rows={data.rows}
          columns={columns}
          getRowId={(row) => row.method}
        />
      </ReportCard>
    </div>
  );
}
