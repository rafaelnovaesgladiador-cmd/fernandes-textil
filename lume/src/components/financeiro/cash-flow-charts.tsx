"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMO_TODAY, dayKey } from "@/lib/dates";
import { formatBRL, formatBRLCompact, formatDayMonth } from "@/lib/format";
import type { CashFlowPoint } from "@/lib/metrics";
import { FinanceTooltip } from "./finance-tooltip";

/**
 * Saldo dia a dia: o realizado (linha cheia) termina hoje e a previsão
 * (linha tracejada) segue a partir daí, com o ponto mais baixo em destaque.
 * A separação visual é o que evita ler previsão como fato consumado.
 */
export function CashFlowChart({ points }: { points: CashFlowPoint[] }) {
  const todayKey = dayKey(DEMO_TODAY);
  const todayLabel = formatDayMonth(DEMO_TODAY);

  const chartData = points.map((point) => ({
    label: formatDayMonth(point.date),
    key: point.key,
    realizado: point.key <= todayKey ? Math.round(point.balance) : null,
    previsto: point.key >= todayKey ? Math.round(point.balance) : null,
  }));

  const future = points.filter((point) => point.key >= todayKey);
  const lowest = future.reduce<CashFlowPoint | null>(
    (worst, point) => (worst === null || point.balance < worst.balance ? point : worst),
    null
  );
  const hasNegative = (lowest?.balance ?? 0) < 0;
  const tickInterval = Math.max(0, Math.ceil(chartData.length / 7) - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo previsto dia a dia</CardTitle>
        <CardDescription>
          30 dias para trás (realizado) e 30 dias para a frente (previsão pelas
          contas em aberto).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="h-64 sm:h-80"
          role="img"
          aria-label="Gráfico do saldo de caixa realizado e previsto"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id="cashRealFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cashProjFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                interval={tickInterval}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                width={72}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(value: number) => formatBRLCompact(value)}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--muted-foreground)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                content={
                  <FinanceTooltip
                    nameMap={{
                      realizado: "Saldo realizado",
                      previsto: "Saldo previsto",
                    }}
                  />
                }
              />
              {hasNegative ? (
                <ReferenceLine y={0} stroke="var(--critical)" strokeWidth={1} />
              ) : null}
              <ReferenceLine
                x={todayLabel}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{
                  value: "hoje",
                  position: "top",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="realizado"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#cashRealFill)"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="previsto"
                stroke="var(--chart-4)"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="url(#cashProjFill)"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              {lowest ? (
                <ReferenceDot
                  x={formatDayMonth(lowest.date)}
                  y={Math.round(lowest.balance)}
                  r={5}
                  fill={hasNegative ? "var(--critical)" : "var(--chart-4)"}
                  stroke="var(--card)"
                  strokeWidth={2}
                  label={{
                    value: `menor saldo · ${formatBRL(lowest.balance)}`,
                    position: "top",
                    fill: hasNegative ? "var(--critical)" : "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-5 rounded-full"
              style={{ background: "var(--chart-1)" }}
            />
            Realizado (já aconteceu)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-5 rounded-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--chart-4) 0 5px, transparent 5px 9px)",
              }}
            />
            Previsão (contas em aberto)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: hasNegative ? "var(--critical)" : "var(--chart-4)" }}
            />
            Ponto mais baixo previsto
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Entradas e saídas por dia — a janela curta é a que cabe na decisão da semana. */
export function CashFlowBars({ points }: { points: CashFlowPoint[] }) {
  const todayKey = dayKey(DEMO_TODAY);
  const chartData = points.map((point) => ({
    label: formatDayMonth(point.date),
    entradas: Math.round(point.inflow),
    saidas: Math.round(point.outflow),
    isFuture: point.key > todayKey,
  }));
  const tickInterval = Math.max(0, Math.ceil(chartData.length / 7) - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entradas e saídas por dia</CardTitle>
        <CardDescription>
          Últimos 7 dias e próximos 14. As barras à direita da linha de hoje são
          previsão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="h-56 sm:h-64"
          role="img"
          aria-label="Gráfico de entradas e saídas por dia"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
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
                cursor={{
                  fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
                }}
                content={
                  <FinanceTooltip
                    nameMap={{ entradas: "Entradas", saidas: "Saídas" }}
                  />
                }
              />
              <ReferenceLine
                x={formatDayMonth(DEMO_TODAY)}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{
                  value: "hoje",
                  position: "top",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="entradas"
                fill="var(--chart-3)"
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
              />
              <Bar
                dataKey="saidas"
                fill="var(--chart-8)"
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: "var(--chart-3)" }}
            />
            Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: "var(--chart-8)" }}
            />
            Saídas
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
