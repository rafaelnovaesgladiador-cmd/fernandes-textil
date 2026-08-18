"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBRL, formatPercent, initials } from "@/lib/format";
import type { SellerPerformance } from "@/lib/metrics";

/** Desempenho das vendedoras no período, com progresso da meta mensal. */
export function SellersCard({
  data,
  showGoal,
}: {
  data: SellerPerformance[];
  showGoal: boolean;
}) {
  const max = Math.max(...data.map((s) => s.revenue), 1);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Desempenho das vendedoras</CardTitle>
          <CardDescription>
            {showGoal ? "Faturamento e meta do mês" : "Faturamento no período"}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/vendedores">Ver todas</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((entry) => (
          <div key={entry.seller.id} className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback
                className="text-white"
                style={{ backgroundColor: entry.seller.avatarColor }}
              >
                {initials(entry.seller.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{entry.seller.name}</p>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {formatBRL(entry.revenue)}
                </p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Progress
                  value={
                    showGoal
                      ? Math.min(entry.goalPercent, 100)
                      : (entry.revenue / max) * 100
                  }
                  className="h-1.5"
                  aria-label={`${entry.seller.name}: ${formatBRL(entry.revenue)}`}
                />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {showGoal
                    ? `${formatPercent(entry.goalPercent)} da meta`
                    : `${entry.salesCount} vendas`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
