"use client";

import { useMemo, useState } from "react";
import { History, PackageSearch } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, DEMO_TODAY_START } from "@/lib/dates";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { AppState } from "@/lib/store/state";
import type { Product, ProductVariant, StockMovement, StockMovementType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FiltrosMobile } from "./filtros-mobile";
import {
  MOVEMENT_BADGE,
  MOVEMENT_LABELS,
  userNamesById,
  variantLabel,
} from "./stock-meta";

type PeriodKey = "7" | "30" | "90" | "tudo";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
  tudo: "Todo o histórico",
};

const PAGE_SIZE = 50;

interface MovementRow {
  movement: StockMovement;
  product?: Product;
  variant?: ProductVariant;
  userName: string;
}

/** Aba Movimentações: o histórico auditável de tudo que entrou e saiu. */
export function MovimentacoesTab({ state }: { state: AppState }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<StockMovementType | "todos">("todos");
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const rows = useMemo<MovementRow[]>(() => {
    const productById = new Map(state.products.map((p) => [p.id, p]));
    const variantById = new Map(state.variants.map((v) => [v.id, v]));
    const users = userNamesById(state);
    return [...state.stockMovements]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((movement) => ({
        movement,
        product: productById.get(movement.productId),
        variant: variantById.get(movement.variantId),
        userName: users.get(movement.userId) ?? "Equipe da loja",
      }));
  }, [state]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const from =
      period === "tudo"
        ? null
        : addDays(DEMO_TODAY_START, -(Number(period) - 1)).getTime();
    return rows.filter((row) => {
      if (type !== "todos" && row.movement.type !== type) return false;
      if (from !== null && new Date(row.movement.date).getTime() < from) return false;
      if (!term) return true;
      return (
        (row.product?.name ?? "").toLowerCase().includes(term) ||
        (row.variant?.sku ?? "").toLowerCase().includes(term) ||
        row.movement.reason.toLowerCase().includes(term)
      );
    });
  }, [rows, query, type, period]);

  const shown = filtered.slice(0, visible);
  const inbound = filtered
    .filter((row) => row.movement.quantity > 0)
    .reduce((sum, row) => sum + row.movement.quantity, 0);
  const outbound = filtered
    .filter((row) => row.movement.quantity < 0)
    .reduce((sum, row) => sum + Math.abs(row.movement.quantity), 0);

  const activeFilters =
    (type !== "todos" ? 1 : 0) + (period !== "30" ? 1 : 0) + (query ? 1 : 0);
  const clearFilters = () => {
    setQuery("");
    setType("todos");
    setPeriod("30");
    setVisible(PAGE_SIZE);
  };

  const typeSelect = (
    <Select
      value={type}
      onValueChange={(value) => {
        setType(value as StockMovementType | "todos");
        setVisible(PAGE_SIZE);
      }}
    >
      <SelectTrigger className="w-full md:w-48" aria-label="Filtrar por tipo de movimentação">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos os tipos</SelectItem>
        {(Object.keys(MOVEMENT_LABELS) as StockMovementType[]).map((option) => (
          <SelectItem key={option} value={option}>
            {MOVEMENT_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const periodSelect = (
    <Select
      value={period}
      onValueChange={(value) => {
        setPeriod(value as PeriodKey);
        setVisible(PAGE_SIZE);
      }}
    >
      <SelectTrigger className="w-full md:w-44" aria-label="Filtrar por período">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((option) => (
          <SelectItem key={option} value={option}>
            {PERIOD_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const columns: Column<MovementRow>[] = [
    {
      id: "data",
      header: "Data e hora",
      cell: (row) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatDateTime(row.movement.date)}
        </span>
      ),
    },
    {
      id: "produto",
      header: "Produto",
      primary: true,
      cell: (row) => (
        <span className="font-medium">
          {row.product?.name ?? "Produto removido"}
        </span>
      ),
    },
    {
      id: "variacao",
      header: "Variação",
      secondary: true,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.variant ? `${variantLabel(row.variant)} · ${row.variant.sku}` : "—"}
        </span>
      ),
    },
    {
      id: "tipo",
      header: "Tipo",
      cell: (row) => (
        <Badge variant={MOVEMENT_BADGE[row.movement.type]}>
          {MOVEMENT_LABELS[row.movement.type]}
        </Badge>
      ),
    },
    {
      id: "quantidade",
      header: "Quantidade",
      align: "right",
      cell: (row) => (
        <span
          className={cn(
            "font-medium tabular-nums",
            row.movement.quantity > 0 ? "text-success-text" : "text-critical"
          )}
        >
          {row.movement.quantity > 0 ? "+" : ""}
          {formatNumber(row.movement.quantity)}
        </span>
      ),
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: (row) => (
        <span className="text-muted-foreground">{row.movement.reason}</span>
      ),
    },
    {
      id: "responsavel",
      header: "Responsável",
      cell: (row) => <span className="whitespace-nowrap">{row.userName}</span>,
    },
  ];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nenhuma movimentação registrada ainda"
        description="Cada venda finalizada, devolução, recebimento de compra e ajuste de estoque cria aqui um registro com data, quantidade, motivo e responsável. Faça um ajuste na aba Posição ou registre uma venda para ver o histórico nascer."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setVisible(PAGE_SIZE);
          }}
          placeholder="Buscar por produto, SKU ou motivo…"
          aria-label="Buscar movimentação"
          className="md:max-w-xs md:flex-1"
        />
        <div className="hidden gap-2 md:flex">
          {typeSelect}
          {periodSelect}
          {activeFilters > 0 ? (
            <Button variant="ghost" onClick={clearFilters}>
              Limpar
            </Button>
          ) : null}
        </div>
        <FiltrosMobile
          activeCount={activeFilters}
          description="Filtre o histórico por tipo de movimentação e período."
          onClear={clearFilters}
        >
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Tipo</p>
            {typeSelect}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Período</p>
            {periodSelect}
          </div>
        </FiltrosMobile>
      </div>

      <p className="text-xs text-muted-foreground">
        {formatNumber(filtered.length)}{" "}
        {filtered.length === 1 ? "movimentação" : "movimentações"} em{" "}
        {PERIOD_LABELS[period].toLowerCase()} ·{" "}
        <span className="font-medium text-success-text">
          +{formatNumber(inbound)}
        </span>{" "}
        peças de entrada ·{" "}
        <span className="font-medium text-critical">-{formatNumber(outbound)}</span>{" "}
        peças de saída · saldo de{" "}
        <span className="font-medium">{formatNumber(inbound - outbound)}</span>{" "}
        peças no período.
      </p>

      <DataTable
        rows={shown}
        columns={columns}
        getRowId={(row) => row.movement.id}
        emptyState={
          <EmptyState
            icon={PackageSearch}
            title="Nenhuma movimentação neste recorte"
            description="Não há registros para o tipo, período ou busca selecionados."
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

      {filtered.length > shown.length ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVisible((current) => current + PAGE_SIZE)}
        >
          Mostrar mais {formatNumber(Math.min(PAGE_SIZE, filtered.length - shown.length))}
        </Button>
      ) : null}
    </div>
  );
}
