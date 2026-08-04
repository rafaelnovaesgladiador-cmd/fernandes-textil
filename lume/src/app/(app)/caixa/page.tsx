"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Clock,
  DoorOpen,
  LockKeyhole,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CashMovementDialog } from "@/components/caixa/cash-movement-dialog";
import { CloseCashDialog } from "@/components/caixa/close-cash-dialog";
import { ExpectedBalanceCard } from "@/components/caixa/expected-balance-card";
import { MovementsList } from "@/components/caixa/movements-list";
import { OpenCashCard } from "@/components/caixa/open-cash-card";
import { PaymentSummary } from "@/components/caixa/payment-summary";
import { SessionHistory } from "@/components/caixa/session-history";
import { formatDuration, sessionTotals } from "@/components/caixa/cash-helpers";
import { useStore } from "@/hooks/use-store";
import { DEMO_TODAY } from "@/lib/dates";
import { formatBRL, formatDateTime } from "@/lib/format";
import { filterSales, isRevenueSale, resolvePeriod } from "@/lib/metrics";

/**
 * Caixa — abertura, movimentações do dia e fechamento com conferência cega.
 *
 * O saldo esperado nasce do fundo de troco somado às vendas em dinheiro e aos
 * reforços, menos as sangrias: é o número que precisa bater com a gaveta.
 */
export default function CaixaPage() {
  const state = useStore();
  const [movementType, setMovementType] = useState<"sangria" | "reforco" | null>(
    null
  );
  const [closeOpen, setCloseOpen] = useState(false);

  const session = state.cashSessions.find((item) => !item.closedAt);

  // Vendas do dia que valem para conferência (canceladas e devolvidas ficam fora).
  const todaySales = filterSales(state, resolvePeriod("hoje").current).filter(
    isRevenueSale
  );
  const cashSales = todaySales
    .filter((sale) => sale.paymentMethod === "dinheiro")
    .reduce((sum, sale) => sum + sale.total, 0);

  const totals = session ? sessionTotals(session, cashSales) : null;

  if (!session || !totals) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Caixa"
          description="Nenhum caixa aberto no momento. Abra o caixa para começar a conferência do dia."
        />
        <OpenCashCard />
        <SessionHistory sessions={state.cashSessions} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Caixa"
        description="Conferência do dinheiro da gaveta: abertura, sangrias, reforços e fechamento."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMovementType("sangria")}
            >
              <ArrowUpFromLine /> Sangria
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMovementType("reforco")}
            >
              <ArrowDownToLine /> Reforço
            </Button>
            <Button size="sm" onClick={() => setCloseOpen(true)}>
              <LockKeyhole /> Fechar caixa
            </Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
        <Badge variant="success">
          <DoorOpen /> Caixa aberto
        </Badge>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Aberto desde</p>
          <p className="font-medium tabular-nums">
            {formatDateTime(session.openedAt)}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Responsável</p>
          <p className="font-medium">{session.userName}</p>
        </div>
        <div className="text-sm">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden /> Tempo aberto
          </p>
          <p className="font-medium tabular-nums">
            {formatDuration(session.openedAt, DEMO_TODAY)}
          </p>
        </div>
      </Card>

      <section
        aria-label="Indicadores do caixa"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Fundo de troco"
          value={formatBRL(totals.opening)}
          icon={Wallet}
          hint="Dinheiro que estava na gaveta na abertura do caixa."
        />
        <StatCard
          label="Vendas em dinheiro hoje"
          value={formatBRL(totals.cashSales)}
          icon={Banknote}
          hint="Somente vendas recebidas em espécie — Pix e cartão não entram na gaveta."
        />
        <StatCard
          label="Sangrias"
          value={formatBRL(totals.withdrawals)}
          icon={ArrowUpFromLine}
          hint="Dinheiro retirado da gaveta durante o dia."
        />
        <StatCard
          label="Reforços"
          value={formatBRL(totals.reinforcements)}
          icon={ArrowDownToLine}
          hint="Dinheiro colocado na gaveta fora das vendas."
        />
      </section>

      <ExpectedBalanceCard totals={totals} />

      <section aria-label="Conferência do dia" className="grid gap-4 lg:grid-cols-2">
        <PaymentSummary sales={todaySales} />
        <MovementsList movements={session.movements} />
      </section>

      <SessionHistory sessions={state.cashSessions} />

      <CashMovementDialog
        type={movementType ?? "sangria"}
        open={movementType !== null}
        onOpenChange={(open) => setMovementType(open ? movementType : null)}
        expected={totals.expected}
      />
      <CloseCashDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        expected={totals.expected}
      />
    </div>
  );
}
