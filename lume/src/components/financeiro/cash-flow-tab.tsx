"use client";

import { useMemo } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMO_TODAY_START, addDays, dayKey } from "@/lib/dates";
import { formatBRL, formatDate } from "@/lib/format";
import { cashFlow } from "@/lib/metrics";
import type { AppState } from "@/lib/store";
import { CashFlowBars, CashFlowChart } from "./cash-flow-charts";
import {
  DueDateCell,
  daysUntilDue,
  payableStatus,
  plural,
  receivableStatus,
} from "./finance-helpers";

interface UpcomingRow {
  id: string;
  kind: "pagar" | "receber";
  description: string;
  counterpart: string;
  dueDate: string;
  amount: number;
}

/** Fluxo de caixa: o que já entrou, o que ainda vai entrar e o que vai sair. */
export function CashFlowTab({ state }: { state: AppState }) {
  const flow = useMemo(() => cashFlow(state, 30, 30), [state]);

  const todayKey = dayKey(DEMO_TODAY_START);
  const future = flow.points.filter((point) => point.key >= todayKey);

  const projected = useMemo(() => {
    const inflow = future.reduce((sum, point) => sum + point.inflow, 0);
    const outflow = future.reduce((sum, point) => sum + point.outflow, 0);
    const firstNegative = future.find((point) => point.balance < 0);
    const daysToNegative = firstNegative
      ? Math.max(0, daysUntilDue(firstNegative.date.toISOString()))
      : null;
    return { inflow, outflow, firstNegative, daysToNegative };
  }, [future]);

  const barsWindow = useMemo(() => {
    const from = dayKey(addDays(DEMO_TODAY_START, -7));
    const to = dayKey(addDays(DEMO_TODAY_START, 14));
    return flow.points.filter((point) => point.key >= from && point.key <= to);
  }, [flow.points]);

  const upcoming = useMemo<UpcomingRow[]>(() => {
    const customers = new Map(state.customers.map((c) => [c.id, c.name]));
    const limit = dayKey(addDays(DEMO_TODAY_START, 30));

    const payables: UpcomingRow[] = state.payables
      .filter((payable) => payableStatus(payable) !== "liquidado")
      .map((payable) => ({
        id: `pag-${payable.id}`,
        kind: "pagar" as const,
        description: payable.description,
        counterpart: payable.supplierName ?? "—",
        dueDate: payable.dueDate,
        amount: payable.amount,
      }));

    const receivables: UpcomingRow[] = state.receivables
      .filter((receivable) => receivableStatus(receivable) !== "liquidado")
      .map((receivable) => ({
        id: `rec-${receivable.id}`,
        kind: "receber" as const,
        description: receivable.description,
        counterpart:
          (receivable.customerId ? customers.get(receivable.customerId) : undefined) ??
          "—",
        dueDate: receivable.dueDate,
        amount: receivable.amount,
      }));

    return [...payables, ...receivables]
      .filter((row) => dayKey(row.dueDate) <= limit)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state.payables, state.receivables, state.customers]);

  const columns: Column<UpcomingRow>[] = [
    {
      id: "description",
      header: "Conta",
      primary: true,
      cell: (row) => <span className="font-medium">{row.description}</span>,
    },
    {
      id: "counterpart",
      header: "Fornecedor / cliente",
      secondary: true,
      cell: (row) => row.counterpart,
    },
    {
      id: "kind",
      header: "Tipo",
      cell: (row) => (
        <Badge variant={row.kind === "pagar" ? "critical" : "success"}>
          {row.kind === "pagar" ? "A pagar" : "A receber"}
        </Badge>
      ),
    },
    {
      id: "due",
      header: "Vencimento",
      cell: (row) => (
        <DueDateCell
          dueDate={row.dueDate}
          status={daysUntilDue(row.dueDate) < 0 ? "vencido" : "aberto"}
        />
      ),
    },
    {
      id: "amount",
      header: "Valor",
      align: "right",
      cell: (row) => (
        <span
          className={
            row.kind === "pagar"
              ? "font-medium tabular-nums text-critical"
              : "font-medium tabular-nums text-success-text"
          }
        >
          {row.kind === "pagar" ? "−" : "+"}
          {formatBRL(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {flow.minProjected < 0 ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-critical/40 bg-critical/8 p-4 sm:flex-row sm:items-start sm:gap-3"
        >
          <TriangleAlert className="size-5 shrink-0 text-critical" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-critical">
              {projected.daysToNegative === null
                ? "O caixa fica negativo dentro dos próximos 30 dias."
                : projected.daysToNegative === 0
                  ? "O caixa já fica negativo hoje."
                  : `Em ${projected.daysToNegative} ${plural(
                      projected.daysToNegative,
                      "dia",
                      "dias"
                    )} o caixa fica negativo.`}
            </p>
            <p className="text-sm text-muted-foreground">
              {projected.firstNegative
                ? `A previsão fica negativa a partir de ${formatDate(
                    projected.firstNegative.date
                  )} e chega no pior momento a ${formatBRL(flow.minProjected)}. `
                : ""}
              Faltam{" "}
              <strong className="font-medium text-foreground">
                {formatBRL(Math.abs(flow.minProjected))}
              </strong>{" "}
              para cobrir esse buraco — antecipe recebimentos, renegocie um
              vencimento ou reforce o caixa antes da data.
            </p>
          </div>
        </div>
      ) : null}

      <section
        aria-label="Indicadores do fluxo de caixa"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Saldo hoje"
          value={formatBRL(flow.currentBalance)}
          icon={Wallet}
          hint="Dinheiro disponível considerando o que já entrou e saiu."
        />
        <StatCard
          label="Entradas previstas (30 dias)"
          value={formatBRL(projected.inflow)}
          icon={ArrowUpCircle}
          hint="Vendas já registradas e parcelas de crediário a vencer."
        />
        <StatCard
          label="Saídas previstas (30 dias)"
          value={formatBRL(projected.outflow)}
          icon={ArrowDownCircle}
          hint="Contas a pagar em aberto e despesas já lançadas."
        />
        <StatCard
          label="Menor saldo previsto"
          value={formatBRL(flow.minProjected)}
          icon={CalendarClock}
          className={flow.minProjected < 0 ? "border-critical/40" : undefined}
          hint="O ponto mais apertado dos próximos 30 dias. É por ele que você deve se planejar."
        />
      </section>

      <CashFlowChart points={flow.points} />
      <CashFlowBars points={barsWindow} />

      <Card>
        <CardHeader>
          <CardTitle>Próximos vencimentos</CardTitle>
          <CardDescription>
            Contas a pagar e a receber dos próximos 30 dias, na ordem em que
            chegam.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={upcoming}
            columns={columns}
            getRowId={(row) => row.id}
            emptyState={
              <EmptyState
                icon={CalendarClock}
                title="Nenhum vencimento nos próximos 30 dias"
                description="Sem contas a pagar ou a receber com data marcada nesse intervalo."
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
