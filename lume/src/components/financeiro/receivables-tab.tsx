"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, HandCoins, Percent } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { receiveReceivable } from "@/lib/store";
import type { AppState } from "@/lib/store";
import type { Receivable } from "@/lib/types";
import { FilterBar } from "./filter-bar";
import {
  DueDateCell,
  SettleBadge,
  daysUntilDue,
  plural,
  receivableStatus,
} from "./finance-helpers";

type StatusFilter = "todas" | "abertas" | "vencidas" | "recebidas";
type DueFilter = "todos" | "atrasadas" | "7d" | "15d" | "30d";

const DUE_LIMITS: Record<Exclude<DueFilter, "todos" | "atrasadas">, number> = {
  "7d": 7,
  "15d": 15,
  "30d": 30,
};

/** Contas a receber: crediário e parcelas que ainda não viraram dinheiro. */
export function ReceivablesTab({ state }: { state: AppState }) {
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [due, setDue] = useState<DueFilter>("todos");
  const [search, setSearch] = useState("");
  const { confirm, dialog } = useConfirm();

  const customerName = useMemo(() => {
    const map = new Map(state.customers.map((c) => [c.id, c.name]));
    return (receivable: Receivable) =>
      (receivable.customerId ? map.get(receivable.customerId) : undefined) ?? "—";
  }, [state.customers]);

  const totals = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let overdueCount = 0;
    for (const receivable of state.receivables) {
      if (receivableStatus(receivable) === "liquidado") continue;
      open += receivable.amount;
      if (daysUntilDue(receivable.dueDate) < 0) {
        overdue += receivable.amount;
        overdueCount += 1;
      }
    }
    return {
      open,
      overdue,
      overdueCount,
      overduePercent: open > 0 ? (overdue / open) * 100 : 0,
    };
  }, [state.receivables]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.receivables
      .filter((receivable) => {
        const situation = receivableStatus(receivable);
        if (status === "abertas" && situation !== "aberto") return false;
        if (status === "vencidas" && situation !== "vencido") return false;
        if (status === "recebidas" && situation !== "liquidado") return false;

        if (due !== "todos") {
          const days = daysUntilDue(receivable.dueDate);
          if (due === "atrasadas") {
            if (situation === "liquidado" || days >= 0) return false;
          } else if (days < 0 || days > DUE_LIMITS[due]) {
            return false;
          }
        }

        if (term) {
          const haystack = `${receivable.description} ${customerName(receivable)}`;
          if (!haystack.toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state.receivables, status, due, search, customerName]);

  const registerPayment = (receivable: Receivable) => {
    confirm({
      title: "Registrar recebimento?",
      description: `${receivable.description} — ${formatBRL(receivable.amount)}, vencimento em ${formatDate(
        receivable.dueDate
      )}. O valor passa a contar como dinheiro que entrou.`,
      confirmLabel: "Sim, recebi",
      onConfirm: () => {
        receiveReceivable(receivable.id);
        toast.success("Recebimento registrado", {
          description: `${formatBRL(receivable.amount)} de ${customerName(receivable)} entrou no caixa.`,
        });
      },
    });
  };

  const columns: Column<Receivable>[] = [
    {
      id: "description",
      header: "Descrição",
      primary: true,
      cell: (row) => <span className="font-medium">{row.description}</span>,
    },
    {
      id: "customer",
      header: "Cliente",
      secondary: true,
      cell: (row) => customerName(row),
    },
    {
      id: "due",
      header: "Vencimento",
      cell: (row) => (
        <DueDateCell dueDate={row.dueDate} status={receivableStatus(row)} />
      ),
    },
    {
      id: "amount",
      header: "Valor",
      align: "right",
      cell: (row) => (
        <span className="font-medium tabular-nums">{formatBRL(row.amount)}</span>
      ),
    },
    {
      id: "status",
      header: "Situação",
      cell: (row) => <SettleBadge status={receivableStatus(row)} kind="receber" />,
    },
  ];

  return (
    <div className="space-y-4">
      <section
        aria-label="Totais de contas a receber"
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        <StatCard
          label="Total a receber"
          value={formatBRL(totals.open)}
          icon={HandCoins}
          hint="Parcelas de crediário que ainda não entraram no caixa."
        />
        <StatCard
          label="Vencido (inadimplência)"
          value={formatBRL(totals.overdue)}
          icon={AlertTriangle}
          className={totals.overdue > 0 ? "border-critical/40" : undefined}
          hint={`${totals.overdueCount} ${plural(totals.overdueCount, "parcela atrasada", "parcelas atrasadas")}. Vale um contato pelo WhatsApp.`}
        />
        <StatCard
          label="Inadimplência sobre o total"
          value={formatPercent(totals.overduePercent, 1)}
          icon={Percent}
          hint="Quanto do que você tem a receber já passou do prazo. Acima de 10% acende o alerta."
        />
      </section>

      <FilterBar
        filters={[
          {
            id: "receivables-status",
            label: "Situação",
            value: status,
            neutralValue: "todas",
            onChange: (value) => setStatus(value as StatusFilter),
            options: [
              { value: "todas", label: "Todas" },
              { value: "abertas", label: "A receber" },
              { value: "vencidas", label: "Vencidas" },
              { value: "recebidas", label: "Recebidas" },
            ],
          },
          {
            id: "receivables-due",
            label: "Vencimento",
            value: due,
            neutralValue: "todos",
            onChange: (value) => setDue(value as DueFilter),
            options: [
              { value: "todos", label: "Qualquer data" },
              { value: "atrasadas", label: "Já vencidas" },
              { value: "7d", label: "Próximos 7 dias" },
              { value: "15d", label: "Próximos 15 dias" },
              { value: "30d", label: "Próximos 30 dias" },
            ],
          },
        ]}
        onReset={() => {
          setStatus("todas");
          setDue("todos");
          setSearch("");
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar parcela ou cliente…"
          aria-label="Buscar conta a receber"
          className="w-full sm:w-64"
        />
      </FilterBar>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            icon={HandCoins}
            title="Nenhuma parcela neste recorte"
            description="As parcelas de crediário aparecem aqui assim que a venda é finalizada."
          />
        }
        actions={(row) =>
          receivableStatus(row) === "liquidado" ? (
            <span className="text-xs text-muted-foreground">Já recebida</span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => registerPayment(row)}
              aria-label={`Registrar recebimento de ${row.description}`}
            >
              <HandCoins /> Registrar recebimento
            </Button>
          )
        }
      />

      {dialog}
    </div>
  );
}
