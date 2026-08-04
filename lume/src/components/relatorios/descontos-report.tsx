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
import { Percent, TicketPercent, TrendingDown, Users } from "lucide-react";
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
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { filterSales, isRevenueSale, summarize } from "@/lib/metrics";

interface SellerDiscountRow {
  sellerId: string;
  name: string;
  salesCount: number;
  discountedSales: number;
  discount: number;
  revenue: number;
  discountPercent: number;
  maxDiscountPercent: number;
}

interface CategoryDiscountRow {
  category: string;
  discount: number;
  revenue: number;
  discountPercent: number;
}

/** Descontos concedidos, quem concede e quanto isso custa de margem. */
export function DescontosReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const productById = new Map(ctx.state.products.map((p) => [p.id, p]));
    const sellerById = new Map(ctx.state.sellers.map((s) => [s.id, s]));
    const sales = filterSales(ctx.state, ctx.range).filter(isRevenueSale);
    const previous = summarize(filterSales(ctx.state, ctx.previousRange));
    const summary = summarize(sales);

    const bySeller = new Map<string, SellerDiscountRow>();
    const byCategory = new Map<string, CategoryDiscountRow>();

    for (const sale of sales) {
      const seller = sellerById.get(sale.sellerId);
      const row = bySeller.get(sale.sellerId) ?? {
        sellerId: sale.sellerId,
        name: seller?.name ?? "Vendedora removida",
        salesCount: 0,
        discountedSales: 0,
        discount: 0,
        revenue: 0,
        discountPercent: 0,
        maxDiscountPercent: 0,
      };
      row.salesCount += 1;
      row.revenue += sale.total;
      row.discount += sale.discount;
      if (sale.discount > 0) row.discountedSales += 1;
      const gross = sale.total + sale.discount;
      if (gross > 0) {
        row.maxDiscountPercent = Math.max(
          row.maxDiscountPercent,
          (sale.discount / gross) * 100
        );
      }
      bySeller.set(sale.sellerId, row);

      // O desconto é do total da venda: rateia entre as categorias dos itens.
      const itemsValue = sale.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      for (const item of sale.items) {
        const category = productById.get(item.productId)?.category ?? "Outros";
        const itemValue = item.unitPrice * item.quantity;
        const entry = byCategory.get(category) ?? {
          category,
          discount: 0,
          revenue: 0,
          discountPercent: 0,
        };
        entry.revenue += itemValue;
        entry.discount +=
          itemsValue > 0 ? sale.discount * (itemValue / itemsValue) : 0;
        byCategory.set(category, entry);
      }
    }

    const sellerRows = [...bySeller.values()]
      .map((row) => ({
        ...row,
        discountPercent:
          row.revenue + row.discount > 0
            ? (row.discount / (row.revenue + row.discount)) * 100
            : 0,
      }))
      .sort((a, b) => b.discount - a.discount);

    const categoryRows = [...byCategory.values()]
      .map((row) => ({
        ...row,
        discountPercent: row.revenue > 0 ? (row.discount / row.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.discount - a.discount);

    const grossRevenue = summary.revenue + summary.discountTotal;
    const marginWithoutDiscount =
      grossRevenue > 0
        ? ((grossRevenue - summary.cost) / grossRevenue) * 100
        : 0;

    return {
      summary,
      previous,
      sellerRows,
      categoryRows,
      grossRevenue,
      marginWithoutDiscount,
      marginImpact: marginWithoutDiscount - summary.margin,
      sharePercent:
        summary.revenue > 0
          ? (summary.discountTotal / summary.revenue) * 100
          : 0,
      previousShare:
        previous.revenue > 0 ? (previous.discountTotal / previous.revenue) * 100 : 0,
      discountedSales: sales.filter((sale) => sale.discount > 0).length,
      totalSales: sales.length,
      maxAllowed: ctx.state.settings.maxDiscountPercent,
    };
  }, [ctx.previousRange, ctx.range, ctx.state]);

  if (data.totalSales === 0) {
    return (
      <ReportEmpty
        description={`Nenhuma venda em ${ctx.periodLabel.toLowerCase()} — sem descontos para analisar.`}
      />
    );
  }

  if (data.summary.discountTotal === 0) {
    return (
      <ReportEmpty
        title="Nenhum desconto concedido"
        description={`As ${formatNumber(data.totalSales)} vendas de ${ctx.periodLabel.toLowerCase()} saíram a preço cheio — a margem do período está preservada.`}
      />
    );
  }

  const chartData = data.sellerRows.map((row) => ({
    name: row.name.split(" ")[0],
    value: Math.round(row.discount),
  }));
  const topSeller = data.sellerRows[0];
  const topCategory = data.categoryRows[0];
  const overLimit = data.sellerRows.filter(
    (row) => row.maxDiscountPercent > data.maxAllowed
  );

  const sellerColumns: Column<SellerDiscountRow>[] = [
    {
      id: "name",
      header: "Vendedora",
      primary: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "sales",
      header: "Vendas com desconto",
      secondary: true,
      cell: (row) =>
        `${formatNumber(row.discountedSales)} de ${formatNumber(row.salesCount)} vendas`,
    },
    {
      id: "discount",
      header: "Desconto concedido",
      align: "right",
      cell: (row) => (
        <span className="font-medium">{formatBRL(row.discount)}</span>
      ),
    },
    {
      id: "percent",
      header: "% sobre o bruto",
      align: "right",
      cell: (row) => (
        <span className={row.discountPercent > 8 ? "text-critical" : undefined}>
          {formatPercent(row.discountPercent, 1)}
        </span>
      ),
    },
    {
      id: "max",
      header: "Maior desconto",
      align: "right",
      cell: (row) =>
        row.maxDiscountPercent > data.maxAllowed ? (
          <Badge variant="critical">
            {formatPercent(row.maxDiscountPercent, 1)}
          </Badge>
        ) : (
          formatPercent(row.maxDiscountPercent, 1)
        ),
    },
    {
      id: "revenue",
      header: "Faturamento",
      align: "right",
      hideOnMobile: true,
      cell: (row) => formatBRL(row.revenue),
    },
  ];

  const categoryColumns: Column<CategoryDiscountRow>[] = [
    {
      id: "category",
      header: "Categoria",
      primary: true,
      cell: (row) => <span className="font-medium">{row.category}</span>,
    },
    {
      id: "discount",
      header: "Desconto rateado",
      align: "right",
      cell: (row) => (
        <span className="font-medium">{formatBRL(row.discount)}</span>
      ),
    },
    {
      id: "revenue",
      header: "Venda a preço cheio",
      align: "right",
      cell: (row) => formatBRL(row.revenue),
    },
    {
      id: "percent",
      header: "% de desconto",
      align: "right",
      cell: (row) => formatPercent(row.discountPercent, 1),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportTotals>
        <ReportStat
          ctx={ctx}
          label="Desconto concedido"
          value={formatBRL(data.summary.discountTotal)}
          current={data.summary.discountTotal}
          previous={data.previous.discountTotal}
          icon={TicketPercent}
          invertDelta
          hint="Sai integralmente do lucro: cada real de desconto é um real a menos de margem."
        />
        <ReportStat
          ctx={ctx}
          label="% sobre o faturamento"
          value={formatPercent(data.sharePercent, 1)}
          current={data.sharePercent}
          previous={data.previousShare}
          icon={Percent}
          invertDelta
        />
        <ReportStat
          ctx={ctx}
          label="Impacto na margem"
          value={`−${formatPercent(data.marginImpact, 1)}`}
          icon={TrendingDown}
          hint={`Sem descontos a margem bruta seria de ${formatPercent(data.marginWithoutDiscount, 1)}, contra ${formatPercent(data.summary.margin, 1)} realizada.`}
        />
        <ReportStat
          ctx={ctx}
          label="Vendas com desconto"
          value={`${formatNumber(data.discountedSales)} de ${formatNumber(data.totalSales)}`}
          icon={Users}
          hint="Quantas vendas do período tiveram algum abatimento."
        />
      </ReportTotals>

      <ReportCard
        title="Desconto por vendedora"
        description="Quem mais abre mão de margem para fechar a venda"
      >
        <div
          className="h-64"
          role="img"
          aria-label="Gráfico de barras do desconto concedido por vendedora"
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
                content={<ChartTooltip nameMap={{ value: "Desconto" }} />}
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
        Os descontos do período somam{" "}
        <strong>{formatBRL(data.summary.discountTotal)}</strong> e derrubaram a
        margem bruta de {formatPercent(data.marginWithoutDiscount, 1)} para{" "}
        {formatPercent(data.summary.margin, 1)} — uma perda de{" "}
        {formatPercent(data.marginImpact, 1)} que iria direto para o lucro.{" "}
        {topSeller
          ? `${topSeller.name.split(" ")[0]} concentra ${formatBRL(topSeller.discount)} (${formatPercent(topSeller.discountPercent, 1)} do que vendeu)`
          : ""}
        {topCategory
          ? ` e ${topCategory.category} é a categoria mais descontada, com ${formatPercent(topCategory.discountPercent, 1)} de abatimento médio`
          : ""}
        .{" "}
        {overLimit.length > 0
          ? `${formatNumber(overLimit.length)} ${overLimit.length === 1 ? "vendedora passou" : "vendedoras passaram"} do limite de ${formatPercent(data.maxAllowed, 0)} definido nas configurações.`
          : `Nenhuma venda passou do limite de ${formatPercent(data.maxAllowed, 0)} definido nas configurações.`}
      </ReportInsight>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportCard
          title="Por vendedora"
          description="Ordenado pelo total de desconto concedido"
        >
          <DataTable
            rows={data.sellerRows}
            columns={sellerColumns}
            getRowId={(row) => row.sellerId}
          />
        </ReportCard>

        <ReportCard
          title="Por categoria"
          description="Desconto rateado pelo valor dos itens de cada venda"
        >
          <DataTable
            rows={data.categoryRows}
            columns={categoryColumns}
            getRowId={(row) => row.category}
          />
        </ReportCard>
      </div>
    </div>
  );
}
