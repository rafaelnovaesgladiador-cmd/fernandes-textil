"use client";

import { Coins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import type { SessionTotals } from "./cash-helpers";

/** O número que o operador precisa bater no fechamento, com a conta à vista. */
export function ExpectedBalanceCard({ totals }: { totals: SessionTotals }) {
  const parts = [
    { label: "Fundo de troco", value: totals.opening, sign: "" },
    { label: "Vendas em dinheiro", value: totals.cashSales, sign: "+" },
    { label: "Reforços", value: totals.reinforcements, sign: "+" },
    { label: "Sangrias", value: totals.withdrawals, sign: "−" },
  ];

  return (
    <Card className="border-primary/30 bg-accent/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Coins className="size-4" aria-hidden />
            Saldo esperado em caixa
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">
            {formatBRL(totals.expected)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            É o dinheiro em espécie que deve estar na gaveta agora.
          </p>
        </div>

        <dl className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          {parts.map((part) => (
            <div key={part.label} className="flex items-center gap-1.5">
              {part.sign ? (
                <span className="text-muted-foreground" aria-hidden>
                  {part.sign}
                </span>
              ) : null}
              <div className="rounded-lg border bg-card px-2.5 py-1.5">
                <dt className="text-[11px] text-muted-foreground">{part.label}</dt>
                <dd className="font-medium tabular-nums">
                  {formatBRL(part.value)}
                </dd>
              </div>
            </div>
          ))}
          <span className="text-muted-foreground" aria-hidden>
            =
          </span>
          <div className="rounded-lg border border-primary/40 bg-card px-2.5 py-1.5">
            <dt className="text-[11px] text-muted-foreground">Esperado</dt>
            <dd className="font-semibold tabular-nums">
              {formatBRL(totals.expected)}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
