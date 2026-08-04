"use client";

import Link from "next/link";
import { CircleAlert, HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_TODAY } from "@/lib/dates";
import { formatBRL, formatDate } from "@/lib/format";
import type { Receivable } from "@/lib/types";

/**
 * Crediário em aberto da cliente. Aparece em destaque no perfil porque é
 * dinheiro da loja parado — e assunto que precisa ser tratado com cuidado.
 */
export function CustomerBalanceCard({
  receivables,
  total,
}: {
  receivables: Receivable[];
  total: number;
}) {
  const overdue = receivables.filter(
    (receivable) =>
      new Date(receivable.dueDate).getTime() < DEMO_TODAY.getTime()
  );

  return (
    <Card className="border-critical/40 bg-critical/5">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="size-4" /> Crediário em aberto
          </CardTitle>
          <CardDescription>
            {formatBRL(total)} em {receivables.length}{" "}
            {receivables.length === 1 ? "parcela" : "parcelas"}
            {overdue.length > 0
              ? ` · ${overdue.length} já ${overdue.length === 1 ? "vencida" : "vencidas"}`
              : " · nenhuma vencida"}
            .
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/financeiro?aba=receber">Ver no financeiro</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {receivables.map((receivable) => {
            const isOverdue =
              new Date(receivable.dueDate).getTime() < DEMO_TODAY.getTime();
            return (
              <li
                key={receivable.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{receivable.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Vence em {formatDate(receivable.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isOverdue ? (
                    <Badge variant="critical">
                      <CircleAlert /> Vencida
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Em aberto</Badge>
                  )}
                  <span className="font-medium tabular-nums">
                    {formatBRL(receivable.amount)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Antes de oferecer desconto ou novidade, combine as parcelas em aberto —
          cobrar cedo e com gentileza costuma preservar a cliente e o caixa.
        </p>
      </CardContent>
    </Card>
  );
}
