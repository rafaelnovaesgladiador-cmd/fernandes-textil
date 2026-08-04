"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Check, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate } from "@/lib/format";
import { payPayable } from "@/lib/store";
import type { AppState } from "@/lib/store";
import type { Payable } from "@/lib/types";
import { FilterBar } from "./filter-bar";
import { NewPayableDialog } from "./new-payable-dialog";
import {
  DueDateCell,
  SettleBadge,
  daysUntilDue,
  payableStatus,
  plural,
} from "./finance-helpers";

type StatusFilter = "todas" | "abertas" | "vencidas" | "pagas";
type DueFilter = "todos" | "atrasadas" | "7d" | "15d" | "30d";

const DUE_LIMITS: Record<Exclude<DueFilter, "todos" | "atrasadas">, number> = {
  "7d": 7,
  "15d": 15,
  "30d": 30,
};

/** Contas a pagar: o que a loja deve, quando vence e o que já passou do prazo. */
export function PayablesTab({ state }: { state: AppState }) {
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [due, setDue] = useState<DueFilter>("todos");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const { confirm, dialog } = useConfirm();

  const totals = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let overdueCount = 0;
    let nextWeek = 0;
    let nextWeekCount = 0;
    for (const payable of state.payables) {
      const situation = payableStatus(payable);
      if (situation === "liquidado") continue;
      open += payable.amount;
      const days = daysUntilDue(payable.dueDate);
      if (days < 0) {
        overdue += payable.amount;
        overdueCount += 1;
      } else if (days <= 7) {
        nextWeek += payable.amount;
        nextWeekCount += 1;
      }
    }
    return { open, overdue, overdueCount, nextWeek, nextWeekCount };
  }, [state.payables]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.payables
      .filter((payable) => {
        const situation = payableStatus(payable);
        if (status === "abertas" && situation !== "aberto") return false;
        if (status === "vencidas" && situation !== "vencido") return false;
        if (status === "pagas" && situation !== "liquidado") return false;

        if (due !== "todos") {
          const days = daysUntilDue(payable.dueDate);
          if (due === "atrasadas") {
            if (situation === "liquidado" || days >= 0) return false;
          } else if (days < 0 || days > DUE_LIMITS[due]) {
            return false;
          }
        }

        if (term) {
          const haystack = `${payable.description} ${payable.supplierName ?? ""}`;
          if (!haystack.toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state.payables, status, due, search]);

  const markAsPaid = (payable: Payable) => {
    confirm({
      title: "Marcar conta como paga?",
      description: `${payable.description} — ${formatBRL(payable.amount)}, vencimento em ${formatDate(
        payable.dueDate
      )}. O valor será lançado como despesa e sai do saldo previsto.`,
      confirmLabel: "Sim, já paguei",
      onConfirm: () => {
        payPayable(payable.id);
        toast.success("Conta baixada", {
          description: `${payable.description} — ${formatBRL(payable.amount)} lançado nas despesas.`,
        });
      },
    });
  };

  const columns: Column<Payable>[] = [
    {
      id: "description",
      header: "Descrição",
      primary: true,
      cell: (row) => <span className="font-medium">{row.description}</span>,
    },
    {
      id: "supplier",
      header: "Fornecedor",
      secondary: true,
      cell: (row) => row.supplierName ?? "—",
    },
    {
      id: "due",
      header: "Vencimento",
      cell: (row) => (
        <DueDateCell dueDate={row.dueDate} status={payableStatus(row)} />
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
      cell: (row) => <SettleBadge status={payableStatus(row)} kind="pagar" />,
    },
  ];

  return (
    <div className="space-y-4">
      <section
        aria-label="Totais de contas a pagar"
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        <StatCard
          label="Total em aberto"
          value={formatBRL(totals.open)}
          icon={Wallet}
          hint="Tudo que a loja ainda deve, vencido ou não."
        />
        <StatCard
          label="Vencido"
          value={formatBRL(totals.overdue)}
          icon={AlertTriangle}
          className={totals.overdue > 0 ? "border-critical/40" : undefined}
          hint={`${totals.overdueCount} ${plural(totals.overdueCount, "conta atrasada", "contas atrasadas")}. Atraso costuma vir com juros e multa.`}
        />
        <StatCard
          label="Vence em até 7 dias"
          value={formatBRL(totals.nextWeek)}
          icon={CalendarClock}
          hint={`${totals.nextWeekCount} ${plural(totals.nextWeekCount, "conta", "contas")} na próxima semana. Garanta o caixa antes.`}
        />
      </section>

      <FilterBar
        filters={[
          {
            id: "payables-status",
            label: "Situação",
            value: status,
            neutralValue: "todas",
            onChange: (value) => setStatus(value as StatusFilter),
            options: [
              { value: "todas", label: "Todas" },
              { value: "abertas", label: "Em aberto" },
              { value: "vencidas", label: "Vencidas" },
              { value: "pagas", label: "Pagas" },
            ],
          },
          {
            id: "payables-due",
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
          placeholder="Buscar conta ou fornecedor…"
          aria-label="Buscar conta a pagar"
          className="w-full sm:w-64"
        />
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus /> Nova conta a pagar
        </Button>
      </FilterBar>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Wallet}
            title="Nenhuma conta neste recorte"
            description="Ajuste os filtros ou cadastre uma nova conta a pagar."
            action={
              <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
                <Plus /> Nova conta a pagar
              </Button>
            }
          />
        }
        actions={(row) =>
          payableStatus(row) === "liquidado" ? (
            <span className="text-xs text-muted-foreground">Já paga</span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAsPaid(row)}
              aria-label={`Marcar ${row.description} como paga`}
            >
              <Check /> Marcar como paga
            </Button>
          )
        }
      />

      <NewPayableDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        supplierNames={state.suppliers.map((supplier) => supplier.name)}
      />
      {dialog}
    </div>
  );
}
