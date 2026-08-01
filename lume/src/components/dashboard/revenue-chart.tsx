"use client";

import {
  CartesianGrid,
  ComposedChart,
  Area,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRLCompact, formatDayMonth } from "@/lib/format";
import type { DailyPoint } from "@/lib/metrics";
import { ChartTooltip } from "./chart-tooltip";

/** Faturamento e lucro bruto por dia. */
export function RevenueChart({ data }: { data: DailyPoint[] }) {
  const chartData = data.map((point) => ({
    label: formatDayMonth(point.date),
    faturamento: Math.round(point.revenue),
    lucro: Math.round(point.profit),
  }));

  // Densidade de rótulos no eixo X conforme o tamanho do período.
  const tickInterval = Math.max(0, Math.ceil(chartData.length / 8) - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento e lucro por dia</CardTitle>
        <CardDescription>Vendas finalizadas no período selecionado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64" role="img" aria-label="Gráfico de faturamento e lucro por dia">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
              <XAxis
                dataKey="label"
                interval={tickInterval}
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
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={
                  <ChartTooltip
                    nameMap={{ faturamento: "Faturamento", lucro: "Lucro bruto" }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="faturamento"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#revFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="lucro"
                stroke="var(--chart-3)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: "var(--chart-1)" }} />
            Faturamento
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: "var(--chart-3)" }} />
            Lucro bruto
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
