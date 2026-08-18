"use client";

import { useMemo } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  ChevronRight,
  PiggyBank,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { DonutCard } from "@/components/dashboard/donut-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEMO_TODAY_START, dayKey } from "@/lib/dates";
import { formatBRL, formatDate } from "@/lib/format";
import {
  cashFlow,
  expensesByCategory,
  expensesInRange,
  filterSales,
  incomeStatement,
  isRevenueSale,
  monthlyExpenseSeries,
  overduePayables,
  overdueReceivables,
  resolvePeriod,
  summarize,
} from "@/lib/metrics";
import type { AppState } from "@/lib/store";
import { EXPENSE_LABELS, type ExpenseCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ExpenseTrendChart } from "./expense-trend-chart";
import { daysUntilDue, plural } from "./finance-helpers";
import { MoneyExplainer } from "./money-explainer";

export type FinanceTab =
  | "visao"
  | "pagar"
  | "receber"
  | "despesas"
  | "fluxo"
  | "dre";

/** Painel de entrada do financeiro: o retrato do mês e o que exige ação hoje. */
export function OverviewTab({
  state,
  onOpenTab,
}: {
  state: AppState;
  onOpenTab: (tab: FinanceTab) => void;
}) {
  const data = useMemo(() => {
    const monthRange = resolvePeriod("mes").current;
    const monthSales = filterSales(state, monthRange);
    const summary = summarize(monthSales);
    const dre = incomeStatement(state, monthRange);
    const flow = cashFlow(state, 30, 30);

    // Dinheiro que efetivamente entrou: vendas à vista do mês mais as parcelas
    // de crediário quitadas com vencimento no mês.
    const cashSales = monthSales
      .filter((sale) => isRevenueSale(sale) && sale.paymentMethod !== "crediario")
      .reduce((sum, sale) => sum + sale.total, 0);
    const settledInstallments = state.receivables
      .filter((receivable) => {
        if (receivable.status !== "recebido") return false;
        const time = new Date(receivable.dueDate).getTime();
        return (
          time >= monthRange.from.getTime() && time < monthRange.to.getTime()
        );
      })
      .reduce((sum, receivable) => sum + receivable.amount, 0);

    const overduePay = overduePayables(state);
    const overdueRec = overdueReceivables(state);
    const firstNegative = flow.points.find(
      (point) => point.key >= dayKey(DEMO_TODAY_START) && point.balance < 0
    );

    return {
      summary,
      dre,
      flow,
      received: cashSales + settledInstallments,
      monthExpenses: expensesInRange(state, monthRange),
      byCategory: expensesByCategory(state, monthRange)
        .slice(0, 6)
        .map((item) => ({
          name: EXPENSE_LABELS[item.name as ExpenseCategory] ?? item.name,
          value: item.value,
        })),
      monthlyExpenses: monthlyExpenseSeries(state),
      overduePayables: {
        count: overduePay.length,
        total: overduePay.reduce((sum, payable) => sum + payable.amount, 0),
      },
      overdueReceivables: {
        count: overdueRec.length,
        total: overdueRec.reduce((sum, receivable) => sum + receivable.amount, 0),
      },
      firstNegative,
    };
  }, [state]);

  const {
    summary,
    dre,
    flow,
    received,
    monthExpenses,
    overduePayables: latePayables,
    overdueReceivables: lateReceivables,
    firstNegative,
  } = data;

  const daysToNegative = firstNegative
    ? Math.max(0, daysUntilDue(firstNegative.date.toISOString()))
    : null;

  return (
    <div className="space-y-4">
      <section
        aria-label="Indicadores do mês"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Saldo em caixa"
          value={formatBRL(flow.currentBalance)}
          icon={Wallet}
          hint="Dinheiro disponível hoje, somando o que entrou e saiu até agora."
        />
        <StatCard
          label="Entradas do mês"
          value={formatBRL(received)}
          icon={ArrowUpCircle}
          hint="Do dia 1º até hoje. O que realmente entrou: vendas à vista, Pix, cartão e parcelas de crediário quitadas."
        />
        <StatCard
          label="Saídas do mês"
          value={formatBRL(monthExpenses)}
          icon={ArrowDownCircle}
          hint="Despesas lançadas do dia 1º até hoje. As contas com vencimento no resto do mês ficam em Contas a pagar."
        />
        <StatCard
          label="Lucro líquido do mês"
          value={formatBRL(dre.netProfit)}
          icon={TrendingUp}
          hint="Do dia 1º até hoje, depois do custo das peças, despesas, taxas, comissões e impostos."
        />
      </section>

      <section
        aria-label="Pontos de atenção"
        className="grid gap-3 md:grid-cols-3"
      >
        <AttentionCard
          tone={latePayables.total > 0 ? "critical" : "neutral"}
          icon={TriangleAlert}
          title="Contas vencidas a pagar"
          value={formatBRL(latePayables.total)}
          description={
            latePayables.count > 0
              ? `${latePayables.count} ${plural(latePayables.count, "conta atrasada", "contas atrasadas")}. Atraso costuma custar juros e multa.`
              : "Nenhuma conta em atraso. Continue assim."
          }
          actionLabel="Ver contas a pagar"
          onAction={() => onOpenTab("pagar")}
        />
        <AttentionCard
          tone={lateReceivables.total > 0 ? "critical" : "neutral"}
          icon={CalendarClock}
          title="Contas vencidas a receber"
          value={formatBRL(lateReceivables.total)}
          description={
            lateReceivables.count > 0
              ? `${lateReceivables.count} ${plural(lateReceivables.count, "parcela atrasada", "parcelas atrasadas")} de clientes. Um lembrete no WhatsApp costuma resolver.`
              : "Nenhuma parcela atrasada de clientes."
          }
          actionLabel="Ver contas a receber"
          onAction={() => onOpenTab("receber")}
        />
        <AttentionCard
          tone={flow.minProjected < 0 ? "critical" : "positive"}
          icon={PiggyBank}
          title="Previsão de caixa (30 dias)"
          value={formatBRL(flow.minProjected)}
          description={
            flow.minProjected < 0
              ? `${
                  daysToNegative === null
                    ? "O caixa fica negativo neste período"
                    : daysToNegative === 0
                      ? "O caixa já fica negativo hoje"
                      : `Em ${daysToNegative} ${plural(daysToNegative, "dia", "dias")} o caixa fica negativo`
                }${firstNegative ? ` (${formatDate(firstNegative.date)})` : ""}. Faltam ${formatBRL(
                  Math.abs(flow.minProjected)
                )} para cobrir.`
              : "Menor saldo previsto para os próximos 30 dias. O caixa se mantém positivo."
          }
          actionLabel="Ver fluxo de caixa"
          onAction={() => onOpenTab("fluxo")}
        />
      </section>

      <MoneyExplainer
        revenue={summary.revenue}
        received={received}
        netProfit={dre.netProfit}
        cashBalance={flow.currentBalance}
      />

      <section aria-label="Despesas" className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseTrendChart data={data.monthlyExpenses} />
        </div>
        {data.byCategory.length > 0 ? (
          <DonutCard
            title="Despesas do mês por categoria"
            description="Onde o dinheiro da operação está indo"
            data={data.byCategory}
          />
        ) : null}
      </section>
    </div>
  );
}

function AttentionCard({
  tone,
  icon: Icon,
  title,
  value,
  description,
  actionLabel,
  onAction,
}: {
  tone: "critical" | "positive" | "neutral";
  icon: typeof TriangleAlert;
  title: string;
  value: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-2 p-4",
        tone === "critical" && "border-critical/40 bg-critical/5"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "size-4",
            tone === "critical" ? "text-critical" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
      </div>
      <p
        className={cn(
          "text-xl font-semibold tabular-nums sm:text-2xl",
          tone === "critical" && "text-critical"
        )}
      >
        {value}
      </p>
      <p className="flex-1 text-xs leading-snug text-muted-foreground">
        {description}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit"
        onClick={onAction}
        aria-label={actionLabel}
      >
        {actionLabel} <ChevronRight />
      </Button>
    </Card>
  );
}
