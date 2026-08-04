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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { monthKey } from "@/lib/dates";
import { DEMO_TODAY } from "@/lib/dates";
import { formatBRLCompact } from "@/lib/format";
import { FinanceTooltip } from "./finance-tooltip";
import { monthLabel } from "./finance-helpers";

/** Evolução das despesas mês a mês — o mês corrente ainda está em curso. */
export function ExpenseTrendChart({
  data,
}: {
  data: Array<{ month: string; total: number }>;
}) {
  const currentMonth = monthKey(DEMO_TODAY);
  const chartData = data.slice(-12).map((item) => ({
    label: monthLabel(item.month),
    isCurrent: item.month === currentMonth,
    despesas: Math.round(item.total),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas por mês</CardTitle>
        <CardDescription>
          Barra mais clara: mês em andamento — já inclui as despesas fixas com data
          marcada para os próximos dias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="h-56 sm:h-64"
          role="img"
          aria-label="Gráfico de despesas por mês"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
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
                content={<FinanceTooltip nameMap={{ despesas: "Despesas" }} />}
              />
              <Bar dataKey="despesas" radius={[4, 4, 0, 0]} maxBarSize={44}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill="var(--chart-2)"
                    fillOpacity={entry.isCurrent ? 0.45 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
