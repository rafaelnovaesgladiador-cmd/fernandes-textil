"use client";

import { useMemo, useState } from "react";
import { Layers, Plus, Receipt, Repeat } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { DEMO_TODAY_START, addDays } from "@/lib/dates";
import {
  expensesByCategory,
  resolvePeriod,
  type DateRange,
  type PeriodKey,
} from "@/lib/metrics";
import type { AppState } from "@/lib/store";
import { EXPENSE_LABELS, type Expense, type ExpenseCategory } from "@/lib/types";
import { FilterBar } from "./filter-bar";
import { NewExpenseDialog } from "./new-expense-dialog";
import { plural } from "./finance-helpers";

type PeriodFilter = PeriodKey | "tudo";
type KindFilter = "todos" | "fixa" | "variavel";

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: "30d", label: "Últimos 30 dias" },
  { value: "mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "tudo", label: "Todo o histórico" },
];

/** Recorte padrão: 30 dias mostram o ciclo completo de despesas fixas. */
const DEFAULT_PERIOD: PeriodFilter = "30d";

const ALL_TIME: DateRange = {
  from: new Date("2000-01-01T00:00:00-03:00"),
  to: addDays(DEMO_TODAY_START, 365),
};

function rangeFor(period: PeriodFilter): DateRange {
  return period === "tudo" ? ALL_TIME : resolvePeriod(period).current;
}

function inRange(dateIso: string, range: DateRange): boolean {
  const time = new Date(dateIso).getTime();
  return time >= range.from.getTime() && time < range.to.getTime();
}

/** Despesas lançadas: quanto sai, em quê, e o que é fixo todo mês. */
export function ExpensesTab({
  state,
  newOpen,
  onNewOpenChange,
}: {
  state: AppState;
  newOpen: boolean;
  onNewOpenChange: (open: boolean) => void;
}) {
  const [period, setPeriod] = useState<PeriodFilter>(DEFAULT_PERIOD);
  const [category, setCategory] = useState<ExpenseCategory | "todas">("todas");
  const [kind, setKind] = useState<KindFilter>("todos");
  const [search, setSearch] = useState("");

  const range = useMemo(() => rangeFor(period), [period]);

  const periodExpenses = useMemo(
    () => state.expenses.filter((expense) => inRange(expense.date, range)),
    [state.expenses, range]
  );

  const totals = useMemo(() => {
    const total = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
    const fixed = periodExpenses
      .filter((e) => e.isFixed)
      .reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expensesByCategory(state, range);
    const top = byCategory[0];
    return {
      total,
      count: periodExpenses.length,
      fixed,
      variable: total - fixed,
      fixedPercent: total > 0 ? (fixed / total) * 100 : 0,
      topCategory: top
        ? {
            label: EXPENSE_LABELS[top.name as ExpenseCategory] ?? top.name,
            value: top.value,
            percent: total > 0 ? (top.value / total) * 100 : 0,
          }
        : null,
    };
  }, [periodExpenses, state, range]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return periodExpenses
      .filter((expense) => {
        if (category !== "todas" && expense.category !== category) return false;
        if (kind === "fixa" && !expense.isFixed) return false;
        if (kind === "variavel" && expense.isFixed) return false;
        if (term && !expense.description.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [periodExpenses, category, kind, search]);

  const columns: Column<Expense>[] = [
    {
      id: "description",
      header: "Descrição",
      primary: true,
      cell: (row) => <span className="font-medium">{row.description}</span>,
    },
    {
      id: "category",
      header: "Categoria",
      secondary: true,
      cell: (row) => (
        <Badge variant="secondary">{EXPENSE_LABELS[row.category]}</Badge>
      ),
    },
    {
      id: "date",
      header: "Data",
      cell: (row) => <span className="tabular-nums">{formatDate(row.date)}</span>,
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
      id: "kind",
      header: "Tipo",
      cell: (row) => (
        <Badge variant={row.isFixed ? "accent" : "outline"}>
          {row.isFixed ? "Fixa" : "Variável"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <section
        aria-label="Totais de despesas"
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        <StatCard
          label="Total do período"
          value={formatBRL(totals.total)}
          icon={Receipt}
          hint={`${totals.count} ${plural(totals.count, "lançamento", "lançamentos")} no período escolhido.`}
        />
        <StatCard
          label="Fixas × variáveis"
          value={`${formatBRL(totals.fixed)} · ${formatPercent(totals.fixedPercent)}`}
          icon={Repeat}
          hint={`Variáveis: ${formatBRL(totals.variable)} (${formatPercent(
            100 - totals.fixedPercent
          )}). As fixas você paga mesmo vendendo pouco — é o seu custo mínimo de operação.`}
        />
        <StatCard
          label="Maior categoria"
          value={
            totals.topCategory
              ? `${totals.topCategory.label} · ${formatBRL(totals.topCategory.value)}`
              : "—"
          }
          icon={Layers}
          hint={
            totals.topCategory
              ? `${formatPercent(totals.topCategory.percent)} de tudo que saiu no período.`
              : "Sem despesas lançadas no período."
          }
        />
      </section>

      <FilterBar
        filters={[
          {
            id: "expenses-period",
            label: "Período",
            value: period,
            neutralValue: DEFAULT_PERIOD,
            onChange: (value) => setPeriod(value as PeriodFilter),
            options: PERIOD_OPTIONS,
          },
          {
            id: "expenses-category",
            label: "Categoria",
            value: category,
            neutralValue: "todas",
            onChange: (value) => setCategory(value as ExpenseCategory | "todas"),
            options: [
              { value: "todas", label: "Todas" },
              ...(Object.keys(EXPENSE_LABELS) as ExpenseCategory[]).map((value) => ({
                value,
                label: EXPENSE_LABELS[value],
              })),
            ],
          },
          {
            id: "expenses-kind",
            label: "Tipo",
            value: kind,
            neutralValue: "todos",
            onChange: (value) => setKind(value as KindFilter),
            options: [
              { value: "todos", label: "Todos" },
              { value: "fixa", label: "Fixas" },
              { value: "variavel", label: "Variáveis" },
            ],
          },
        ]}
        onReset={() => {
          setPeriod(DEFAULT_PERIOD);
          setCategory("todas");
          setKind("todos");
          setSearch("");
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar despesa…"
          aria-label="Buscar despesa"
          className="w-full sm:w-64"
        />
        <Button size="sm" onClick={() => onNewOpenChange(true)}>
          <Plus /> Nova despesa
        </Button>
      </FilterBar>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="Nenhuma despesa neste recorte"
            description="Mude o período ou a categoria — ou lance a primeira despesa do período."
            action={
              <Button size="sm" variant="outline" onClick={() => onNewOpenChange(true)}>
                <Plus /> Nova despesa
              </Button>
            }
          />
        }
      />

      <NewExpenseDialog open={newOpen} onOpenChange={onNewOpenChange} />
    </div>
  );
}
