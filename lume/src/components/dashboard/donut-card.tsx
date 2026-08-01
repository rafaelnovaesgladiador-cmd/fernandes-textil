"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatPercent } from "@/lib/format";
import type { NamedValue } from "@/lib/metrics";
import { ChartTooltip } from "./chart-tooltip";

const SLOT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Rosca para composição (canais, formas de pagamento).
 * Cores por entidade em ordem fixa; legenda com valores diretos.
 */
export function DonutCard({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: NamedValue[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data.map((item) => ({
    ...item,
    value: Math.round(item.value),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div
          className="mx-auto h-36 w-36"
          role="img"
          aria-label={`Gráfico: ${title}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<ChartTooltip />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={64}
                paddingAngle={2}
                strokeWidth={2}
                stroke="var(--card)"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={SLOT_COLORS[index % SLOT_COLORS.length]}
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
                style={{ background: SLOT_COLORS[index % SLOT_COLORS.length] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {entry.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {total > 0 ? formatPercent((entry.value / total) * 100) : "—"}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatBRL(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
