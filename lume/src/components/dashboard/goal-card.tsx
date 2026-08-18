"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatBRL, formatPercent } from "@/lib/format";

/** Meta do mês + resultado líquido estimado — o "placar" da loja. */
export function GoalCard({
  goalTarget,
  monthRevenue,
  netProfit,
  monthExpenses,
  grossMargin,
}: {
  goalTarget: number;
  monthRevenue: number;
  netProfit: number;
  monthExpenses: number;
  grossMargin: number;
}) {
  const percent = goalTarget > 0 ? (monthRevenue / goalTarget) * 100 : 0;
  const remaining = Math.max(goalTarget - monthRevenue, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            <Target className="size-4 text-primary" />
            Meta de agosto
          </CardTitle>
          <CardDescription>Faturamento do mês vs. meta</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatBRL(monthRevenue)}
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              de {formatBRL(goalTarget)}
            </p>
          </div>
          <Progress value={Math.min(percent, 100)} className="mt-2 h-2.5" aria-label={`Meta: ${formatPercent(percent, 1)} atingida`} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{formatPercent(percent, 1)}</span>{" "}
            da meta · faltam {formatBRL(remaining)}
          </p>
        </div>

        <Separator />

        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Despesas do mês</dt>
            <dd className="font-medium tabular-nums">{formatBRL(monthExpenses)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Margem bruta</dt>
            <dd className="font-medium tabular-nums">{formatPercent(grossMargin, 1)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Lucro líquido estimado</dt>
            <dd
              className={
                netProfit >= 0
                  ? "font-semibold tabular-nums text-success-text"
                  : "font-semibold tabular-nums text-critical"
              }
            >
              {formatBRL(netProfit)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/financeiro">Ver financeiro completo</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
