"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CircleDollarSign, Package, Percent, Wallet } from "lucide-react";
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
import {
  formatBRL,
  formatBRLCompact,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { stockAnalysis, stockSummary } from "@/lib/metrics";

interface CategoryRow {
  category: string;
  products: number;
  pieces: number;
  cost: number;
  potential: number;
  margin: number;
  stalledValue: number;
}

/** Posição de estoque por categoria: peças, capital investido e potencial. */
export function EstoqueReport({ ctx }: ReportProps) {
  const data = useMemo(() => {
    const productById = new Map(ctx.state.products.map((p) => [p.id, p]));
    const rows = new Map<string, CategoryRow>();

    for (const variant of ctx.state.variants) {
      const product = productById.get(variant.productId);
      if (!product) continue;
      const row = rows.get(product.category) ?? {
        category: product.category,
        products: 0,
        pieces: 0,
        cost: 0,
        potential: 0,
        margin: 0,
        stalledValue: 0,
      };
      row.pieces += variant.stock;
      row.cost += variant.stock * product.cost;
      row.potential += variant.stock * (product.promoPrice ?? product.price);
      rows.set(product.category, row);
    }

    for (const product of ctx.state.products) {
      const row = rows.get(product.category);
      if (row) row.products += 1;
    }

    const analysis = stockAnalysis(ctx.state);
    for (const item of analysis) {
      if (!item.isStalled) continue;
      const row = rows.get(item.product.category);
      if (row) row.stalledValue += item.stockCost;
    }

    const list = [...rows.values()]
      .map((row) => ({
        ...row,
        margin:
          row.potential > 0 ? ((row.potential - row.cost) / row.potential) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    return {
      list,
      summary: stockSummary(ctx.state),
      needsRestock: analysis.filter(
        (item) => item.needsRestock && item.product.status === "ativo"
      ).length,
      stalled: analysis.filter((item) => item.isStalled).length,
    };
  }, [ctx.state]);

  if (data.list.length === 0) {
    return (
      <ReportEmpty
        title="Estoque sem posição"
        description="Nenhuma variação com saldo cadastrado. Registre entradas ou receba um pedido de compra."
      />
    );
  }

  const chartData = data.list.slice(0, 8).map((row) => ({
    name: row.category,
    custo: Math.round(row.cost),
    potencial: Math.round(row.potential),
  }));

  const biggest = data.list[0];
  const biggestShare =
    data.summary.stockCost > 0 ? (biggest.cost / data.summary.stockCost) * 100 : 0;

  const columns: Column<CategoryRow>[] = [
    {
      id: "category",
      header: "Categoria",
      primary: true,
      cell: (row) => <span className="font-medium">{row.category}</span>,
    },
    {
      id: "products",
      header: "Produtos",
      align: "right",
      cell: (row) => formatNumber(row.products),
    },
    {
      id: "pieces",
      header: "Peças",
      align: "right",
      cell: (row) => formatNumber(row.pieces),
    },
    {
      id: "cost",
      header: "Custo",
      align: "right",
      cell: (row) => <span className="font-medium">{formatBRL(row.cost)}</span>,
    },
    {
      id: "potential",
      header: "Potencial",
      align: "right",
      cell: (row) => formatBRL(row.potential),
    },
    {
      id: "margin",
      header: "Margem",
      align: "right",
      cell: (row) => formatPercent(row.margin, 1),
    },
    {
      id: "stalled",
      header: "Parado +90d",
      align: "right",
      cell: (row) =>
        row.stalledValue > 0 ? (
          <span className="text-critical">{formatBRL(row.stalledValue)}</span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportTotals>
        <ReportStat
          ctx={ctx}
          label="Peças em estoque"
          value={formatNumber(data.summary.totalPieces)}
          icon={Package}
        />
        <ReportStat
          ctx={ctx}
          label="Custo do estoque"
          value={formatBRL(data.summary.stockCost)}
          icon={Wallet}
          hint="Capital investido nas peças que estão na loja hoje."
        />
        <ReportStat
          ctx={ctx}
          label="Potencial de venda"
          value={formatBRL(data.summary.stockPotential)}
          icon={CircleDollarSign}
          hint="Valor do estoque a preço de etiqueta, já com promoções aplicadas."
        />
        <ReportStat
          ctx={ctx}
          label="Margem potencial"
          value={formatPercent(data.summary.potentialMargin, 1)}
          icon={Percent}
        />
      </ReportTotals>

      <ReportCard
        title="Custo × potencial por categoria"
        description="Posição atual do estoque — não depende do período selecionado"
      >
        <div
          className="h-72"
          role="img"
          aria-label="Gráfico de barras com custo e potencial de venda por categoria"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={56}
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
                content={
                  <ChartTooltip
                    nameMap={{ custo: "Custo", potencial: "Potencial de venda" }}
                  />
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
                formatter={(value: string) =>
                  value === "custo" ? "Custo" : "Potencial de venda"
                }
              />
              <Bar dataKey="custo" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="potencial" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>

      <ReportInsight>
        {biggest.category} concentra <strong>{formatPercent(biggestShare, 1)}</strong>{" "}
        do capital parado em estoque ({formatBRL(biggest.cost)}). No total,{" "}
        {formatBRL(data.summary.stalled.value)} estão em{" "}
        {formatNumber(data.stalled)} produtos sem venda há mais de 90 dias
        {data.summary.stalled.value > data.summary.stockCost * 0.15
          ? " — parcela alta do estoque: considere liquidação ou vitrine para girar esse capital."
          : " — proporção saudável frente ao estoque total."}{" "}
        {data.needsRestock > 0
          ? `${formatNumber(data.needsRestock)} produtos ativos têm cobertura abaixo de 15 dias e pedem reposição.`
          : "Nenhum produto ativo está com cobertura crítica."}
      </ReportInsight>

      <ReportCard
        title="Posição por categoria"
        description="Ordenado pelo capital investido"
      >
        <DataTable
          rows={data.list}
          columns={columns}
          getRowId={(row) => row.category}
        />
      </ReportCard>
    </div>
  );
}
