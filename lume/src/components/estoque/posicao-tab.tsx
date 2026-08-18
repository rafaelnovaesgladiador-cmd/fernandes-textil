"use client";

import { useMemo, useState } from "react";
import {
  CircleDollarSign,
  Package,
  PackageSearch,
  PackageX,
  Percent,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { stockSummary } from "@/lib/metrics";
import type { AppState } from "@/lib/store/state";
import { cn } from "@/lib/utils";
import { AjusteEstoqueDialog } from "./ajuste-estoque-dialog";
import { FiltrosMobile } from "./filtros-mobile";
import {
  buildStockRows,
  categoriesOf,
  STATUS_META,
  type StockRow,
} from "./stock-meta";

type AlertKey = "sem_estoque" | "abaixo" | "parados";

/** Aba Posição: quanto existe, quanto vale e o que precisa de atenção agora. */
export function PosicaoTab({ state }: { state: AppState }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todos");
  const [alert, setAlert] = useState<AlertKey | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  const rows = useMemo(() => buildStockRows(state), [state]);
  const summary = useMemo(() => stockSummary(state), [state]);
  const categories = useMemo(() => categoriesOf(rows), [rows]);

  const counts = useMemo(() => {
    const semEstoque = rows.filter((r) => r.status === "sem_estoque");
    const abaixo = rows.filter((r) => r.status === "abaixo");
    const parados = rows.filter((r) => r.isStalled);
    const value = (list: StockRow[]) =>
      list.reduce((sum, r) => sum + r.stockCost, 0);
    return {
      semEstoque: { count: semEstoque.length, value: value(semEstoque) },
      abaixo: { count: abaixo.length, value: value(abaixo) },
      parados: { count: parados.length, value: value(parados) },
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== "todos" && row.product.category !== category) return false;
      if (alert === "sem_estoque" && row.status !== "sem_estoque") return false;
      if (alert === "abaixo" && row.status !== "abaixo") return false;
      if (alert === "parados" && !row.isStalled) return false;
      if (!term) return true;
      return (
        row.product.name.toLowerCase().includes(term) ||
        row.product.sku.toLowerCase().includes(term) ||
        row.product.category.toLowerCase().includes(term) ||
        row.product.brand.toLowerCase().includes(term)
      );
    });
  }, [rows, query, category, alert]);

  const adjustingRow =
    rows.find((row) => row.product.id === adjusting) ?? null;

  const activeFilters =
    (category !== "todos" ? 1 : 0) + (alert ? 1 : 0) + (query ? 1 : 0);
  const clearFilters = () => {
    setQuery("");
    setCategory("todos");
    setAlert(null);
  };

  const needsAttention = counts.semEstoque.count + counts.abaixo.count;
  const attentionShare =
    rows.length > 0 ? (needsAttention / rows.length) * 100 : 0;

  const categorySelect = (
    <Select value={category} onValueChange={setCategory}>
      <SelectTrigger className="w-full md:w-44" aria-label="Filtrar por categoria">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todas as categorias</SelectItem>
        {categories.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const statusSelect = (
    <Select
      value={alert ?? "todos"}
      onValueChange={(value) =>
        setAlert(value === "todos" ? null : (value as AlertKey))
      }
    >
      <SelectTrigger className="w-full md:w-48" aria-label="Filtrar por situação">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todas as situações</SelectItem>
        <SelectItem value="sem_estoque">Sem estoque</SelectItem>
        <SelectItem value="abaixo">Abaixo do mínimo</SelectItem>
        <SelectItem value="parados">Parados há +90 dias</SelectItem>
      </SelectContent>
    </Select>
  );

  const columns: Column<StockRow>[] = [
    {
      id: "produto",
      header: "Produto",
      primary: true,
      cell: (row) => <span className="font-medium">{row.product.name}</span>,
    },
    {
      id: "categoria",
      header: "Categoria",
      secondary: true,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.product.category} · {row.product.sku}
        </span>
      ),
    },
    {
      id: "estoque",
      header: "Estoque",
      align: "right",
      cell: (row) => (
        <span
          className={cn(
            "tabular-nums",
            row.status === "sem_estoque" && "font-medium text-critical"
          )}
        >
          {formatNumber(row.stock)}
        </span>
      ),
    },
    {
      id: "minimo",
      header: "Mínimo",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {formatNumber(row.minimum)}
        </span>
      ),
    },
    {
      id: "semVenda",
      header: "Sem venda",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span
          className={cn("tabular-nums", row.isStalled && "text-serious")}
        >
          {formatNumber(row.daysSinceLastSale)} d
        </span>
      ),
    },
    {
      id: "custo",
      header: "Valor em custo",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums">{formatBRL(row.stockCost)}</span>
      ),
    },
    {
      id: "status",
      header: "Situação",
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={STATUS_META[row.status].variant}>
            {STATUS_META[row.status].label}
          </Badge>
          {row.isStalled ? <Badge variant="outline">Parado</Badge> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <section
        aria-label="Resumo do estoque"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Peças em estoque"
          value={formatNumber(summary.totalPieces)}
          icon={Package}
          hint={`Distribuídas em ${formatNumber(rows.length)} produtos ativos.`}
        />
        <StatCard
          label="Valor em custo"
          value={formatBRL(summary.stockCost)}
          icon={Wallet}
          hint="Quanto dinheiro da loja está investido nas peças da arara."
        />
        <StatCard
          label="Potencial de venda"
          value={formatBRL(summary.stockPotential)}
          icon={CircleDollarSign}
          hint="Quanto o estoque renderia se tudo fosse vendido a preço de etiqueta."
        />
        <StatCard
          label="Margem potencial"
          value={formatPercent(summary.potentialMargin, 1)}
          icon={Percent}
          hint="Diferença entre o preço de etiqueta e o custo do estoque atual."
        />
      </section>

      <section aria-label="Alertas de estoque" className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <AlertCard
            active={alert === "sem_estoque"}
            onClick={() => setAlert(alert === "sem_estoque" ? null : "sem_estoque")}
            icon={PackageX}
            tone="critical"
            title="Sem estoque"
            count={counts.semEstoque.count}
            description="Produtos ativos com saldo zerado — invisíveis para quem entra na loja."
          />
          <AlertCard
            active={alert === "abaixo"}
            onClick={() => setAlert(alert === "abaixo" ? null : "abaixo")}
            icon={TriangleAlert}
            tone="warning"
            title="Abaixo do mínimo"
            count={counts.abaixo.count}
            description="O saldo já está menor do que o mínimo definido para o produto."
          />
          <AlertCard
            active={alert === "parados"}
            onClick={() => setAlert(alert === "parados" ? null : "parados")}
            icon={PackageSearch}
            tone="serious"
            title="Parados há +90 dias"
            count={counts.parados.count}
            description={`${formatBRL(counts.parados.value)} em custo sem girar.`}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {needsAttention === 0
            ? "Nenhum produto abaixo do mínimo ou sem estoque — a reposição está em dia."
            : `${formatNumber(needsAttention)} de ${formatNumber(rows.length)} produtos (${formatPercent(
                attentionShare
              )} do catálogo) estão sem estoque ou abaixo do mínimo. Toque em um cartão para filtrar a lista.`}
        </p>
      </section>

      <section aria-label="Produtos em estoque" className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por produto, SKU ou marca…"
            aria-label="Buscar produto no estoque"
            className="md:max-w-xs md:flex-1"
          />
          <div className="hidden gap-2 md:flex">
            {categorySelect}
            {statusSelect}
            {activeFilters > 0 ? (
              <Button variant="ghost" onClick={clearFilters}>
                Limpar
              </Button>
            ) : null}
          </div>
          <FiltrosMobile
            activeCount={activeFilters}
            description="Refine a lista por categoria e situação do estoque."
            onClear={clearFilters}
          >
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Categoria</p>
              {categorySelect}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Situação</p>
              {statusSelect}
            </div>
          </FiltrosMobile>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatNumber(filtered.length)}{" "}
          {filtered.length === 1 ? "produto" : "produtos"} ·{" "}
          {formatNumber(filtered.reduce((sum, r) => sum + r.stock, 0))} peças ·{" "}
          {formatBRL(filtered.reduce((sum, r) => sum + r.stockCost, 0))} em custo
        </p>

        <DataTable
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.product.id}
          actions={(row) => (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjusting(row.product.id)}
              aria-label={`Ajustar estoque de ${row.product.name}`}
            >
              <SlidersHorizontal />
              Ajustar
            </Button>
          )}
          emptyState={
            <EmptyState
              icon={PackageSearch}
              title="Nenhum produto neste recorte"
              description="Ajuste a busca ou os filtros para encontrar o que procura."
              action={
                activeFilters > 0 ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : null
              }
            />
          }
        />
      </section>

      <AjusteEstoqueDialog
        row={adjustingRow}
        open={adjustingRow !== null}
        onOpenChange={(open) => {
          if (!open) setAdjusting(null);
        }}
      />
    </div>
  );
}

const TONE_CLASSES = {
  critical: "bg-critical/12 text-critical",
  warning: "bg-warning/15 text-[#8a6100] dark:text-warning",
  serious: "bg-serious/15 text-[#a34a26] dark:text-serious",
} as const;

function AlertCard({
  active,
  onClick,
  icon: Icon,
  tone,
  title,
  count,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONE_CLASSES;
  title: string;
  count: number;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-xl border bg-card p-4 text-left text-card-foreground shadow-xs transition-colors",
        "outline-none hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring/50",
        active && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            TONE_CLASSES[tone]
          )}
          aria-hidden
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5 text-sm font-medium">
            <span className="text-lg font-semibold tabular-nums">
              {formatNumber(count)}
            </span>
            {title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          <p className="mt-1 text-xs font-medium text-primary">
            {active
              ? "Filtro aplicado · toque para remover"
              : "Toque para filtrar a lista"}
          </p>
        </div>
      </div>
    </button>
  );
}
