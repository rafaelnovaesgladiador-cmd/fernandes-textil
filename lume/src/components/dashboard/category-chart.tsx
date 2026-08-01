"use client";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRLCompact } from "@/lib/format";
import type { NamedValue } from "@/lib/metrics";
import { ChartTooltip } from "./chart-tooltip";

/** Barras horizontais — vendas por categoria (magnitude, cor única). */
export function CategoryChart({ data }: { data: NamedValue[] }) {
  const chartData = data.slice(0, 7).map((item) => ({
    ...item,
    value: Math.round(item.value),
  }));
  const height = Math.max(180, chartData.length * 36);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas por categoria</CardTitle>
        <CardDescription>Faturamento no período selecionado</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }} role="img" aria-label="Gráfico de vendas por categoria">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
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
                width={86}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
                content={<ChartTooltip nameMap={{ value: "Faturamento" }} />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill="var(--chart-1)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
