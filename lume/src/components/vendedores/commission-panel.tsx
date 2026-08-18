"use client";

import { useState } from "react";
import { BadgeCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatBRL, formatPercent, initials } from "@/lib/format";
import type { SellerPerformance } from "@/lib/metrics";

const RULE_LABELS = {
  percentual_fixo: "Percentual fixo",
  por_categoria: "Por categoria",
  por_faixa_de_meta: "Por faixa de meta",
} as const;

/**
 * Comissões do período. O pagamento em si continua fora do sistema — aqui a
 * marcação serve para a loja não perder o controle de quem já recebeu.
 */
export function CommissionPanel({
  data,
  periodLabel,
}: {
  data: SellerPerformance[];
  periodLabel: string;
}) {
  const [paid, setPaid] = useState<string[]>([]);

  const total = data.reduce((sum, entry) => sum + entry.commission, 0);
  const totalRevenue = data.reduce((sum, entry) => sum + entry.revenue, 0);
  const paidTotal = data
    .filter((entry) => paid.includes(entry.seller.id))
    .reduce((sum, entry) => sum + entry.commission, 0);

  const togglePaid = (entry: SellerPerformance) => {
    const already = paid.includes(entry.seller.id);
    setPaid((current) =>
      already
        ? current.filter((id) => id !== entry.seller.id)
        : [...current, entry.seller.id]
    );
    if (already) {
      toast("Pagamento desmarcado", {
        description: `${entry.seller.name} voltou para a lista de comissões a pagar.`,
      });
    } else {
      toast.success("Comissão marcada como paga", {
        description: `${entry.seller.name} · ${formatBRL(entry.commission)}`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4" /> Comissões — {periodLabel}
        </CardTitle>
        <CardDescription>
          {formatBRL(total)} previstos no período, o equivalente a{" "}
          {formatPercent(totalRevenue > 0 ? (total / totalRevenue) * 100 : 0, 1)} do
          faturamento da equipe. Entram como despesa no resultado do mês.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/60 p-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Total previsto</p>
            <p className="text-base font-semibold tabular-nums">
              {formatBRL(total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Já marcado como pago</p>
            <p className="text-base font-semibold tabular-nums">
              {formatBRL(paidTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">A pagar</p>
            <p className="text-base font-semibold tabular-nums">
              {formatBRL(total - paidTotal)}
            </p>
          </div>
        </div>

        <Separator />

        <ul className="space-y-3">
          {data.map((entry) => {
            const isPaid = paid.includes(entry.seller.id);
            return (
              <li
                key={entry.seller.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
              >
                <Avatar className="size-8">
                  <AvatarFallback
                    className="text-white"
                    style={{ backgroundColor: entry.seller.avatarColor }}
                  >
                    {initials(entry.seller.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {entry.seller.name}
                    <Badge variant="outline">
                      {RULE_LABELS[entry.seller.commissionRule.type]}
                    </Badge>
                    {isPaid ? (
                      <Badge variant="success">
                        <BadgeCheck /> Paga
                      </Badge>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.seller.commissionRule.description} ·{" "}
                    {formatBRL(entry.revenue)} vendidos no período
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatBRL(entry.commission)}
                  </span>
                  <Button
                    variant={isPaid ? "ghost" : "outline"}
                    size="sm"
                    aria-label={
                      isPaid
                        ? `Desmarcar comissão paga de ${entry.seller.name}`
                        : `Marcar comissão de ${entry.seller.name} como paga`
                    }
                    onClick={() => togglePaid(entry)}
                  >
                    {isPaid ? "Desmarcar" : "Marcar como paga"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-muted-foreground">
          A marcação de pagamento fica apenas nesta tela, para conferência do
          fechamento. O lançamento no financeiro continua sendo feito na aba de
          despesas.
        </p>
      </CardContent>
    </Card>
  );
}
