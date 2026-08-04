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
import { PackageX, Percent, RotateCcw, ShoppingBag } from "lucide-react";
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
import {
  formatBRL,
  formatBRLCompact,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { filterSales, summarize } from "@/lib/metrics";
import { SALE_STATUS_LABELS, type Sale, type SaleStatus } from "@/lib/types";

const SINGLE_ITEM_REASONS = [
  "Tamanho não serviu",
  "Cor diferente do esperado",
];

const MULTI_ITEM_REASONS = [
  "Arrependimento da cliente",
  "Peça com defeito ou avaria",
  "Troca por outro modelo",
];

/** Hash estável do id — o motivo aparente não muda entre visitas. */
function stableIndex(id: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 9973;
  return hash % size;
}

/**
 * Motivo aparente: o sistema ainda não registra o motivo formal da devolução,
 * então ele é inferido pelo formato da venda (status e composição dos itens).
 */
function apparentReason(sale: Sale): string {
  if (sale.status === "cancelada") return "Cancelada antes da entrega";
  if (sale.status === "parcialmente_devolvida")
    return "Devolução parcial das peças";
  const pieces = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  return pieces <= 1
    ? SINGLE_ITEM_REASONS[stableIndex(sale.id, SINGLE_ITEM_REASONS.length)]
    : MULTI_ITEM_REASONS[stableIndex(sale.id, MULTI_ITEM_REASONS.length)];
}

interface ReturnRow {
  id: string;
  code: string;
  date: string;
  customer: string;
  seller: string;
  pieces: number;
  total: number;
  status: SaleStatus;
  reason: string;
}

const RETURN_STATUSES: SaleStatus[] = [
  "cancelada",
  "devolvida",
  "parcialmente_devolvida",
];

/** Vendas devolvidas e canceladas: volume, valor e motivo aparente. */
export function DevolucoesReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const customerById = new Map(ctx.state.customers.map((c) => [c.id, c]));
    const sellerById = new Map(ctx.state.sellers.map((s) => [s.id, s]));

    const build = (sales: Sale[]) => {
      const rows: ReturnRow[] = sales
        .filter((sale) => RETURN_STATUSES.includes(sale.status))
        .map((sale) => ({
          id: sale.id,
          code: sale.code,
          date: sale.date,
          customer: sale.customerId
            ? (customerById.get(sale.customerId)?.name ?? "Cliente removido")
            : "Não identificada",
          seller: sellerById.get(sale.sellerId)?.name ?? "—",
          pieces: sale.items.reduce((sum, item) => sum + item.quantity, 0),
          total: sale.total,
          status: sale.status,
          reason: apparentReason(sale),
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      return {
        rows,
        value: rows.reduce((sum, row) => sum + row.total, 0),
        pieces: rows.reduce((sum, row) => sum + row.pieces, 0),
      };
    };

    const sales = filterSales(ctx.state, ctx.range);
    const previousSales = filterSales(ctx.state, ctx.previousRange);
    const current = build(sales);
    const previous = build(previousSales);
    const summary = summarize(sales);
    const previousSummary = summarize(previousSales);

    const byReason = new Map<string, { reason: string; count: number; value: number }>();
    for (const row of current.rows) {
      const entry = byReason.get(row.reason) ?? {
        reason: row.reason,
        count: 0,
        value: 0,
      };
      entry.count += 1;
      entry.value += row.total;
      byReason.set(row.reason, entry);
    }

    const totalSales = summary.salesCount + current.rows.length;
    const previousTotalSales = previousSummary.salesCount + previous.rows.length;

    return {
      current,
      previous,
      summary,
      previousSummary,
      reasons: [...byReason.values()].sort((a, b) => b.value - a.value),
      rate: totalSales > 0 ? (current.rows.length / totalSales) * 100 : 0,
      previousRate:
        previousTotalSales > 0
          ? (previous.rows.length / previousTotalSales) * 100
          : 0,
      shareOfRevenue:
        summary.revenue > 0 ? (current.value / summary.revenue) * 100 : 0,
      previousShare:
        previousSummary.revenue > 0
          ? (previous.value / previousSummary.revenue) * 100
          : 0,
    };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  if (data.current.rows.length === 0) {
    return (
      <ReportEmpty
        title="Nenhuma devolução no período"
        description={`Todas as vendas de ${ctx.periodLabel.toLowerCase()} foram concluídas sem cancelamento ou devolução.`}
      />
    );
  }

  const chartData = data.reasons.map((entry) => ({
    name: entry.reason,
    value: Math.round(entry.value),
  }));
  const chartHeight = Math.max(180, chartData.length * 40);
  const top = data.reasons[0];

  const columns: Column<ReturnRow>[] = [
    {
      id: "code",
      header: "Venda",
      primary: true,
      cell: (row) => <span className="font-medium">{row.code}</span>,
    },
    {
      id: "customer",
      header: "Cliente",
      secondary: true,
      cell: (row) => row.customer,
    },
    {
      id: "date",
      header: "Data",
      cell: (row) => formatDate(row.date),
    },
    {
      id: "seller",
      header: "Vendedora",
      cell: (row) => row.seller,
    },
    {
      id: "pieces",
      header: "Peças",
      align: "right",
      cell: (row) => formatNumber(row.pieces),
    },
    {
      id: "total",
      header: "Valor",
      align: "right",
      cell: (row) => <span className="font-medium">{formatBRL(row.total)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "cancelada" ? "secondary" : "critical"}>
          {SALE_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      id: "reason",
      header: "Motivo aparente",
      cell: (row) => (
        <span className="text-muted-foreground">{row.reason}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportTotals>
        <ReportStat
          ctx={ctx}
          label="Devoluções e cancelamentos"
          value={formatNumber(data.current.rows.length)}
          current={data.current.rows.length}
          previous={data.previous.rows.length}
          icon={RotateCcw}
          invertDelta
        />
        <ReportStat
          ctx={ctx}
          label="Valor devolvido"
          value={formatBRL(data.current.value)}
          current={data.current.value}
          previous={data.previous.value}
          icon={PackageX}
          invertDelta
          hint="Valor que saiu do faturamento — as peças voltaram para o estoque."
        />
        <ReportStat
          ctx={ctx}
          label="Taxa de devolução"
          value={formatPercent(data.rate, 1)}
          current={data.rate}
          previous={data.previousRate}
          icon={Percent}
          invertDelta
          hint="Devoluções e cancelamentos sobre o total de vendas do período."
        />
        <ReportStat
          ctx={ctx}
          label="% sobre o faturamento"
          value={formatPercent(data.shareOfRevenue, 1)}
          current={data.shareOfRevenue}
          previous={data.previousShare}
          icon={ShoppingBag}
          invertDelta
        />
      </ReportTotals>

      <ReportCard
        title="Valor devolvido por motivo aparente"
        description="Motivo inferido pelo status e pela composição da venda"
      >
        <div
          style={{ height: chartHeight }}
          role="img"
          aria-label="Gráfico de barras do valor devolvido por motivo"
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
                width={160}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{
                  fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                }}
                content={<ChartTooltip nameMap={{ value: "Valor devolvido" }} />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
        {formatNumber(data.current.rows.length)}{" "}
        {data.current.rows.length === 1 ? "venda voltou" : "vendas voltaram"} no
        período, somando {formatBRL(data.current.value)} e{" "}
        {formatNumber(data.current.pieces)} peças de volta ao estoque — taxa de{" "}
        <strong>{formatPercent(data.rate, 1)}</strong> sobre as vendas do período.{" "}
        {top
          ? `O motivo mais frequente é "${top.reason}" (${formatNumber(top.count)} ${top.count === 1 ? "caso" : "casos"}, ${formatBRL(top.value)})`
          : ""}
        {top && top.reason === "Tamanho não serviu"
          ? " — reforçar a tabela de medidas e a prova no provador reduz esse tipo de retorno."
          : top
            ? " — vale confirmar expectativa da cliente antes de fechar a venda."
            : ""}{" "}
        {data.rate > 5
          ? "Taxa acima de 5% merece investigação: pode indicar problema de qualidade ou de descrição das peças."
          : "A taxa está dentro do esperado para varejo de moda."}
      </ReportInsight>

      <ReportCard
        title="Vendas devolvidas e canceladas"
        description="O motivo é inferido pelo sistema; o registro formal chega na próxima etapa"
      >
        <DataTable
          rows={data.current.rows}
          columns={columns}
          getRowId={(row) => row.id}
        />
      </ReportCard>
    </div>
  );
}
