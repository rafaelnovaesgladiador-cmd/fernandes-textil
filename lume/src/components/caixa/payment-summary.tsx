"use client";

import {
  Banknote,
  CreditCard,
  NotebookPen,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBRL, formatNumber } from "@/lib/format";
import { PAYMENT_LABELS, type PaymentMethod, type Sale } from "@/lib/types";
import { plural } from "@/components/financeiro/finance-helpers";

const ORDER: PaymentMethod[] = [
  "pix",
  "credito",
  "debito",
  "dinheiro",
  "crediario",
];

const ICONS: Record<PaymentMethod, LucideIcon> = {
  pix: Smartphone,
  credito: CreditCard,
  debito: CreditCard,
  dinheiro: Banknote,
  crediario: NotebookPen,
};

/** Conferência do dia por forma de pagamento — só o dinheiro entra na gaveta. */
export function PaymentSummary({ sales }: { sales: Sale[] }) {
  const totals = ORDER.map((method) => {
    const filtered = sales.filter((sale) => sale.paymentMethod === method);
    return {
      method,
      label: PAYMENT_LABELS[method],
      count: filtered.length,
      value: filtered.reduce((sum, sale) => sum + sale.total, 0),
    };
  });

  const total = totals.reduce((sum, item) => sum + item.value, 0);
  const count = totals.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas de hoje por forma de pagamento</CardTitle>
        <CardDescription>
          Use para conferir maquininha e extrato do Pix. Só o que foi em dinheiro
          está na gaveta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {totals.map((item) => {
          const Icon = ICONS[item.method];
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.method} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatNumber(item.count)}{" "}
                  {plural(item.count, "venda", "vendas")}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatBRL(item.value)}
                </span>
              </div>
              <Progress
                value={percent}
                aria-label={`${item.label}: ${formatBRL(item.value)}`}
                indicatorClassName={
                  item.method === "dinheiro" ? "bg-chart-3" : "bg-primary/60"
                }
              />
            </div>
          );
        })}

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">
            Total do dia · {formatNumber(count)} {plural(count, "venda", "vendas")}
          </span>
          <span className="font-semibold tabular-nums">{formatBRL(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
