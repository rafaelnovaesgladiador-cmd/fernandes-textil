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
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { formatBRLCompact } from "@/lib/format";
import type { SellerPerformance } from "@/lib/metrics";

/** Faturamento por vendedora no período — barras horizontais, uma cor por pessoa. */
export function SellerRevenueChart({
  data,
  periodLabel,
}: {
  data: SellerPerformance[];
  periodLabel: string;
}) {
  const chartData = data.map((entry, index) => ({
    name: entry.seller.name.split(" ")[0],
    value: Math.round(entry.revenue),
    color: `var(--chart-${(index % 8) + 1})`,
  }));
  const height = Math.max(180, chartData.length * 40);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento por vendedora</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          style={{ height }}
          role="img"
          aria-label="Gráfico de faturamento por vendedora"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              barSize={18}
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
                width={80}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{
                  fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                }}
                content={<ChartTooltip nameMap={{ value: "Faturamento" }} />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
