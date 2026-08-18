"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { TicketPercent, UserPlus, Users, UsersRound } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  REPORT_COLORS,
  ReportCard,
  ReportEmpty,
  ReportInsight,
  ReportStat,
  ReportTotals,
  type ReportProps,
} from "@/components/relatorios/report-shell";
import { formatBRL, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { filterSales, isRevenueSale } from "@/lib/metrics";
import type { Sale } from "@/lib/types";

interface CustomerRow {
  customerId: string;
  name: string;
  city: string;
  kind: "novo" | "recorrente";
  purchases: number;
  pieces: number;
  revenue: number;
  ticket: number;
  lastPurchase: string;
}

interface SegmentTotals {
  customers: number;
  revenue: number;
  purchases: number;
}

function emptySegment(): SegmentTotals {
  return { customers: 0, revenue: 0, purchases: 0 };
}

function pieces(sale: Sale): number {
  return sale.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Novos × recorrentes, ticket por segmento e os 10 melhores clientes. */
export function ClientesReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const customerById = new Map(ctx.state.customers.map((c) => [c.id, c]));

    /** Primeira compra de cada cliente em toda a base — define quem é novo. */
    const firstPurchase = new Map<string, string>();
    for (const sale of ctx.state.sales) {
      if (!sale.customerId || !isRevenueSale(sale)) continue;
      const current = firstPurchase.get(sale.customerId);
      if (!current || sale.date < current) {
        firstPurchase.set(sale.customerId, sale.date);
      }
    }

    const build = (sales: Sale[]) => {
      const valid = sales.filter(isRevenueSale);
      const identified = valid.filter((sale) => sale.customerId);
      const anonymous = valid.filter((sale) => !sale.customerId);
      const byCustomer = new Map<string, Sale[]>();
      for (const sale of identified) {
        const list = byCustomer.get(sale.customerId as string) ?? [];
        list.push(sale);
        byCustomer.set(sale.customerId as string, list);
      }

      const novos = emptySegment();
      const recorrentes = emptySegment();
      const rows: CustomerRow[] = [];

      for (const [customerId, customerSales] of byCustomer) {
        const customer = customerById.get(customerId);
        const revenue = customerSales.reduce((sum, s) => sum + s.total, 0);
        const first = firstPurchase.get(customerId);
        const isNew =
          Boolean(first) &&
          new Date(first as string).getTime() >= ctx.range.from.getTime();
        const segment = isNew ? novos : recorrentes;
        segment.customers += 1;
        segment.revenue += revenue;
        segment.purchases += customerSales.length;

        rows.push({
          customerId,
          name: customer?.name ?? "Cliente removido",
          city: customer?.city ?? "—",
          kind: isNew ? "novo" : "recorrente",
          purchases: customerSales.length,
          pieces: customerSales.reduce((sum, s) => sum + pieces(s), 0),
          revenue,
          ticket: revenue / customerSales.length,
          lastPurchase: customerSales
            .map((s) => s.date)
            .sort((a, b) => b.localeCompare(a))[0],
        });
      }

      const identifiedRevenue = identified.reduce((sum, s) => sum + s.total, 0);
      return {
        rows: rows.sort((a, b) => b.revenue - a.revenue),
        novos,
        recorrentes,
        anonymousRevenue: anonymous.reduce((sum, s) => sum + s.total, 0),
        anonymousCount: anonymous.length,
        identifiedRevenue,
        identifiedCount: identified.length,
        ticket:
          identified.length > 0 ? identifiedRevenue / identified.length : 0,
      };
    };

    return {
      current: build(filterSales(ctx.state, ctx.range)),
      previous: build(filterSales(ctx.state, ctx.previousRange)),
    };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  const { current, previous } = data;

  if (current.rows.length === 0 && current.anonymousCount === 0) {
    return (
      <ReportEmpty
        description={`Nenhuma venda em ${ctx.periodLabel.toLowerCase()} — sem clientes para analisar.`}
      />
    );
  }

  const totalCustomers = current.novos.customers + current.recorrentes.customers;
  const previousCustomers =
    previous.novos.customers + previous.recorrentes.customers;
  const novoTicket =
    current.novos.purchases > 0
      ? current.novos.revenue / current.novos.purchases
      : 0;
  const recorrenteTicket =
    current.recorrentes.purchases > 0
      ? current.recorrentes.revenue / current.recorrentes.purchases
      : 0;

  const chartData = [
    { name: "Novos", value: Math.round(current.novos.revenue) },
    { name: "Recorrentes", value: Math.round(current.recorrentes.revenue) },
    { name: "Não identificado", value: Math.round(current.anonymousRevenue) },
  ].filter((entry) => entry.value > 0);
  const chartTotal = chartData.reduce((sum, entry) => sum + entry.value, 0);

  const columns: Column<CustomerRow>[] = [
    {
      id: "name",
      header: "Cliente",
      primary: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "kind",
      header: "Segmento",
      secondary: true,
      cell: (row) => (
        <Badge variant={row.kind === "novo" ? "accent" : "secondary"}>
          {row.kind === "novo" ? "Novo" : "Recorrente"}
        </Badge>
      ),
    },
    {
      id: "purchases",
      header: "Compras",
      align: "right",
      cell: (row) => formatNumber(row.purchases),
    },
    {
      id: "pieces",
      header: "Peças",
      align: "right",
      cell: (row) => formatNumber(row.pieces),
    },
    {
      id: "revenue",
      header: "Valor",
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
      id: "last",
      header: "Última compra",
      align: "right",
      hideOnMobile: true,
      cell: (row) => formatDate(row.lastPurchase),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportTotals>
        <ReportStat
          ctx={ctx}
          label="Clientes atendidos"
          value={formatNumber(totalCustomers)}
          current={totalCustomers}
          previous={previousCustomers}
          icon={Users}
          hint="Clientes identificados em pelo menos uma venda do período."
        />
        <ReportStat
          ctx={ctx}
          label="Clientes novos"
          value={formatNumber(current.novos.customers)}
          current={current.novos.customers}
          previous={previous.novos.customers}
          icon={UserPlus}
          hint="Primeira compra da vida da cliente aconteceu dentro do período."
        />
        <ReportStat
          ctx={ctx}
          label="Clientes recorrentes"
          value={formatNumber(current.recorrentes.customers)}
          current={current.recorrentes.customers}
          previous={previous.recorrentes.customers}
          icon={UsersRound}
        />
        <ReportStat
          ctx={ctx}
          label="Ticket médio identificado"
          value={formatBRL(current.ticket)}
          current={current.ticket}
          previous={previous.ticket}
          icon={TicketPercent}
        />
      </ReportTotals>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportCard
          title="Faturamento por segmento"
          description="Quanto vem de quem já era cliente e quanto vem de gente nova"
        >
          <div
            className="mx-auto h-44 w-44"
            role="img"
            aria-label="Gráfico de rosca do faturamento por segmento de cliente"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={76}
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
          <ul className="mt-4 space-y-2">
            {chartData.map((entry, index) => (
              <li key={entry.name} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    background: REPORT_COLORS[index % REPORT_COLORS.length],
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {entry.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {chartTotal > 0
                    ? formatPercent((entry.value / chartTotal) * 100)
                    : "—"}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatBRL(entry.value)}
                </span>
              </li>
            ))}
          </ul>
        </ReportCard>

        <ReportCard
          title="Ticket médio por segmento"
          description="Quanto cada tipo de cliente gasta por atendimento"
        >
          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3 border-b pb-3">
              <dt>
                Novos
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatNumber(current.novos.purchases)} vendas
                </span>
              </dt>
              <dd className="text-base font-semibold tabular-nums">
                {formatBRL(novoTicket)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b pb-3">
              <dt>
                Recorrentes
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatNumber(current.recorrentes.purchases)} vendas
                </span>
              </dt>
              <dd className="text-base font-semibold tabular-nums">
                {formatBRL(recorrenteTicket)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt>
                Sem cliente identificado
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatNumber(current.anonymousCount)} vendas
                </span>
              </dt>
              <dd className="text-base font-semibold tabular-nums">
                {current.anonymousCount > 0
                  ? formatBRL(current.anonymousRevenue / current.anonymousCount)
                  : "—"}
              </dd>
            </div>
          </dl>
        </ReportCard>
      </div>

      <ReportInsight>
        {formatNumber(current.novos.customers)} clientes novos representam{" "}
        <strong>
          {formatPercent(
            totalCustomers > 0
              ? (current.novos.customers / totalCustomers) * 100
              : 0,
            1
          )}
        </strong>{" "}
        da base atendida no período.{" "}
        {recorrenteTicket > novoTicket
          ? `A cliente recorrente gasta ${formatBRL(recorrenteTicket - novoTicket)} a mais por compra que a nova — vale investir em recompra (pós-venda e campanhas).`
          : `A cliente nova gasta ${formatBRL(novoTicket - recorrenteTicket)} a mais por compra que a recorrente — a captação está trazendo tíquete alto, mas a recompra precisa de atenção.`}{" "}
        {current.anonymousCount > 0
          ? `${formatNumber(current.anonymousCount)} vendas saíram sem cliente identificado (${formatBRL(current.anonymousRevenue)}): cadastrar no balcão aumentaria o alcance do CRM.`
          : "Todas as vendas do período têm cliente identificado."}
      </ReportInsight>

      <ReportCard
        title="Top 10 clientes por valor"
        description="Quem mais comprou no período selecionado"
      >
        <DataTable
          rows={current.rows.slice(0, 10)}
          columns={columns}
          getRowId={(row) => row.customerId}
        />
      </ReportCard>
    </div>
  );
}
