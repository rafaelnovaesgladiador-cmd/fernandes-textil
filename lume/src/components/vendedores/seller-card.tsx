"use client";

import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBRL, formatNumber, formatPercent, initials } from "@/lib/format";
import type { SellerPerformance } from "@/lib/metrics";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm font-medium tabular-nums",
          tone === "good" && "text-success-text",
          tone === "bad" && "text-critical"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Cartão de desempenho individual — todas as métricas do período juntas. */
export function SellerCard({
  entry,
  position,
  showGoal,
  topRevenue,
  onEditGoal,
}: {
  entry: SellerPerformance;
  position: number;
  showGoal: boolean;
  topRevenue: number;
  onEditGoal: (entry: SellerPerformance) => void;
}) {
  const goalPercent = Math.min(entry.goalPercent, 100);
  const sharePercent = topRevenue > 0 ? (entry.revenue / topRevenue) * 100 : 0;
  const returnRate =
    entry.salesCount + entry.returns > 0
      ? (entry.returns / (entry.salesCount + entry.returns)) * 100
      : 0;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarFallback
            className="text-white"
            style={{ backgroundColor: entry.seller.avatarColor }}
          >
            {initials(entry.seller.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{entry.seller.name}</p>
            <Badge variant="secondary">{position}º no período</Badge>
          </div>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {formatBRL(entry.revenue)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar meta de ${entry.seller.name}`}
          onClick={() => onEditGoal(entry)}
        >
          <Pencil />
        </Button>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {showGoal
              ? `Meta do mês: ${formatBRL(entry.seller.monthlyGoal)}`
              : "Comparado com o topo do ranking"}
          </span>
          <span className="font-medium tabular-nums">
            {showGoal
              ? formatPercent(entry.goalPercent)
              : formatPercent(sharePercent)}
          </span>
        </div>
        <Progress
          value={showGoal ? goalPercent : sharePercent}
          className="mt-1.5 h-2"
          aria-label={`${entry.seller.name}: ${
            showGoal
              ? `${formatPercent(entry.goalPercent)} da meta`
              : `${formatPercent(sharePercent)} do faturamento da líder`
          }`}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Vendas" value={formatNumber(entry.salesCount)} />
        <Metric label="Ticket médio" value={formatBRL(entry.ticket)} />
        <Metric label="Peças" value={formatNumber(entry.pieces)} />
        <Metric label="Margem média" value={formatPercent(entry.margin, 1)} />
        <Metric
          label="Desconto médio"
          value={formatPercent(entry.discountAverage, 1)}
          tone={entry.discountAverage > 8 ? "bad" : "default"}
        />
        <Metric label="Comissão prevista" value={formatBRL(entry.commission)} />
        <Metric
          label="Clientes atendidas"
          value={formatNumber(entry.customersServed)}
        />
        <Metric
          label="Devoluções"
          value={
            entry.returns > 0
              ? `${formatNumber(entry.returns)} (${formatPercent(returnRate, 1)})`
              : "Nenhuma"
          }
          tone={entry.returns === 0 ? "good" : returnRate > 8 ? "bad" : "default"}
        />
      </dl>
    </Card>
  );
}
