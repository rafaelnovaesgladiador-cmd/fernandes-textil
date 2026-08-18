"use client";

import { HelpCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Faturamento ≠ dinheiro recebido ≠ lucro ≠ saldo em caixa.
 *
 * A confusão entre esses quatro números é a origem de boa parte das decisões
 * erradas na loja ("vendi muito, mas não tenho dinheiro"). O painel mostra os
 * quatro lado a lado, com a explicação em uma frase.
 */
export function MoneyExplainer({
  revenue,
  received,
  netProfit,
  cashBalance,
}: {
  revenue: number;
  received: number;
  netProfit: number;
  cashBalance: number;
}) {
  const items = [
    {
      key: "faturamento",
      label: "Faturamento",
      value: revenue,
      color: "var(--chart-1)",
      explanation:
        "Tudo que você vendeu no mês — inclusive o crediário que ainda não foi pago.",
    },
    {
      key: "recebido",
      label: "Dinheiro recebido",
      value: received,
      color: "var(--chart-3)",
      explanation:
        "O que realmente entrou: dinheiro, Pix, cartão e parcelas de crediário quitadas.",
    },
    {
      key: "lucro",
      label: "Lucro líquido",
      value: netProfit,
      color: netProfit >= 0 ? "var(--chart-6)" : "var(--critical)",
      explanation:
        "O que sobrou depois das peças vendidas, despesas, taxas, comissões e impostos.",
    },
    {
      key: "caixa",
      label: "Saldo em caixa",
      value: cashBalance,
      color: "var(--chart-7)",
      explanation:
        "Quanto você tem disponível hoje. Pode estar alto com lucro baixo — e o contrário também.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <HelpCircle className="size-4 text-muted-foreground" />
          Entenda os quatro números do mês
        </CardTitle>
        <CardDescription>
          Do dia 1º até hoje. Vender muito não é a mesma coisa que ter dinheiro no
          caixa — e nenhum dos dois é lucro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border bg-secondary/30 p-3.5"
              style={{ borderLeft: `3px solid ${item.color}` }}
            >
              <dt className="text-xs font-medium text-muted-foreground">
                {item.label}
              </dt>
              <dd
                className={cn(
                  "mt-1 text-lg font-semibold tabular-nums sm:text-xl",
                  item.key === "lucro" &&
                    (item.value >= 0 ? "text-success-text" : "text-critical")
                )}
              >
                {formatBRL(item.value)}
              </dd>
              <dd className="mt-1.5 text-xs leading-snug text-muted-foreground">
                {item.explanation}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Exemplo prático: uma venda no crediário entra no{" "}
          <strong className="font-medium text-foreground">faturamento</strong> hoje,
          vira <strong className="font-medium text-foreground">dinheiro recebido</strong>{" "}
          só quando a cliente pagar a parcela, e só é{" "}
          <strong className="font-medium text-foreground">lucro</strong> depois de
          descontar o custo da peça e as despesas do mês.
        </p>
      </CardContent>
    </Card>
  );
}
