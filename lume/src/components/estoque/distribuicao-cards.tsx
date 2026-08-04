"use client";

import { useMemo, useState } from "react";
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
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatBRLCompact, formatNumber, formatPercent } from "@/lib/format";
import { stockByCategory, stockBySize } from "@/lib/metrics";
import type { AppState } from "@/lib/store/state";

const SIZE_COLORS = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-7)",
];

/** Tooltip em peças — o gráfico de tamanhos conta unidades, não reais. */
function PiecesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-0.5 font-medium text-foreground">Tamanho {label}</p>
      <p className="text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground">
          {formatNumber(value)}
        </span>{" "}
        {value === 1 ? "peça" : "peças"}
      </p>
    </div>
  );
}

/** Distribuição do estoque: onde o dinheiro está e em quais tamanhos. */
export function DistribuicaoCards({ state }: { state: AppState }) {
  const [category, setCategory] = useState("todas");

  const byCategory = useMemo(() => stockByCategory(state), [state]);
  const bySize = useMemo(
    () => stockBySize(state, category === "todas" ? undefined : category),
    [state, category]
  );

  const categories = useMemo(
    () => byCategory.map((item) => item.name),
    [byCategory]
  );

  const categoryTotal = byCategory.reduce((sum, item) => sum + item.value, 0);
  const topCategory = byCategory[0];
  const topCategoryShare =
    categoryTotal > 0 && topCategory ? (topCategory.value / categoryTotal) * 100 : 0;

  const sizeTotal = bySize.reduce((sum, item) => sum + item.value, 0);
  const topSize = [...bySize].sort((a, b) => b.value - a.value)[0];
  const topSizeShare =
    sizeTotal > 0 && topSize ? (topSize.value / sizeTotal) * 100 : 0;
  const smallestSize = [...bySize]
    .filter((item) => item.name !== "U")
    .sort((a, b) => a.value - b.value)[0];
  const smallestShare =
    sizeTotal > 0 && smallestSize ? (smallestSize.value / sizeTotal) * 100 : 0;

  const categoryData = byCategory.map((item) => ({
    ...item,
    value: Math.round(item.value),
  }));
  const sizeData = bySize.map((item) => ({ ...item, value: Math.round(item.value) }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Estoque por categoria</CardTitle>
          <CardDescription>
            Valor em custo parado em cada categoria da loja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            style={{ height: Math.max(180, categoryData.length * 34) }}
            role="img"
            aria-label="Gráfico de estoque por categoria"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
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
                  width={92}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{
                    fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                  }}
                  content={<ChartTooltip nameMap={{ value: "Custo em estoque" }} />}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill="var(--chart-1)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
            {topCategory ? (
              <>
                <strong className="text-foreground">{topCategory.name}</strong>{" "}
                concentra {formatPercent(topCategoryShare)} do dinheiro investido
                no estoque ({formatBRL(topCategory.value)} de{" "}
                {formatBRL(categoryTotal)}). Se essa categoria travar, é o caixa
                inteiro que sente.
              </>
            ) : (
              "Sem estoque cadastrado para analisar a distribuição por categoria."
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Estoque por tamanho</CardTitle>
              <CardDescription>
                Peças disponíveis em cada tamanho — a grade que a cliente
                encontra na arara.
              </CardDescription>
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger size="sm" aria-label="Filtrar tamanhos por categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-48" role="img" aria-label="Gráfico de estoque por tamanho">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sizeData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                barSize={44}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(value: number) => formatNumber(value)}
                />
                <Tooltip
                  cursor={{
                    fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                  }}
                  content={<PiecesTooltip />}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {sizeData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={SIZE_COLORS[index % SIZE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
            {topSize ? (
              <>
                O tamanho{" "}
                <strong className="text-foreground">{topSize.name}</strong>{" "}
                representa {formatPercent(topSizeShare)} do estoque
                {category === "todas" ? "" : ` de ${category}`} (
                {formatNumber(topSize.value)} peças).{" "}
                {smallestSize &&
                smallestSize.name !== topSize.name &&
                topSizeShare - smallestShare > 8
                  ? `O tamanho ${smallestSize.name} responde por apenas ${formatPercent(
                      smallestShare
                    )} — confira se ele está furando na grade ou se vende menos mesmo.`
                  : "A grade está equilibrada: nenhum tamanho concentra o estoque, o que reduz o risco de perder venda por falta de numeração."}
              </>
            ) : (
              "Sem peças em estoque para esta categoria."
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
