"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDollarSign,
  Plus,
  Shirt,
  ShoppingBag,
  TicketPercent,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/data-table";
import { SaleStatusBadge } from "@/components/vendas/sale-status-badge";
import {
  DEFAULT_SALES_FILTERS,
  SalesFiltersBar,
  countActiveFilters,
  type SalesHistoryFilters,
} from "@/components/vendas/sales-filters";
import { useStore } from "@/hooks/use-store";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import { PERIOD_LABELS, filterSales, resolvePeriod, summarize } from "@/lib/metrics";
import { CHANNEL_LABELS, PAYMENT_LABELS, type Sale } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Histórico de vendas: indicadores do período, filtros e a lista completa. */
export default function VendasPage() {
  const router = useRouter();
  const state = useStore();
  const [filters, setFilters] = useState<SalesHistoryFilters>(
    DEFAULT_SALES_FILTERS
  );

  const customerById = useMemo(
    () => new Map(state.customers.map((c) => [c.id, c.name])),
    [state.customers]
  );
  const sellerById = useMemo(
    () => new Map(state.sellers.map((s) => [s.id, s.name])),
    [state.sellers]
  );

  const rows = useMemo(() => {
    const range = resolvePeriod(filters.period).current;
    const term = filters.query.trim().toLowerCase().replace("#", "");

    return filterSales(state, range, {
      channel: filters.channel,
      sellerId: filters.sellerId,
    })
      .filter((sale) => {
        if (filters.status !== "todos" && sale.status !== filters.status)
          return false;
        if (
          filters.paymentMethod !== "todos" &&
          sale.paymentMethod !== filters.paymentMethod
        )
          return false;
        if (term.length > 0) {
          const customer = sale.customerId
            ? customerById.get(sale.customerId) ?? ""
            : "";
          const matches =
            sale.code.toLowerCase().replace("#", "").includes(term) ||
            customer.toLowerCase().includes(term);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state, filters, customerById]);

  const summary = useMemo(() => summarize(rows), [rows]);
  const activeFilters = countActiveFilters(filters);

  const pieces = (sale: Sale) =>
    sale.items.reduce((sum, item) => sum + item.quantity, 0);

  const columns: Column<Sale>[] = [
    {
      id: "code",
      header: "Código",
      primary: true,
      cell: (sale) => (
        <span className="font-medium tabular-nums">{sale.code}</span>
      ),
    },
    {
      id: "date",
      header: "Data",
      secondary: true,
      cell: (sale) => formatDateTime(sale.date),
    },
    {
      id: "customer",
      header: "Cliente",
      cell: (sale) => (
        <span className="block max-w-40 truncate">
          {sale.customerId
            ? customerById.get(sale.customerId) ?? "Cliente removida"
            : "Sem cliente"}
        </span>
      ),
    },
    {
      id: "seller",
      header: "Vendedora",
      cell: (sale) => sellerById.get(sale.sellerId) ?? "—",
    },
    {
      id: "channel",
      header: "Canal",
      hideOnMobile: true,
      cell: (sale) => CHANNEL_LABELS[sale.channel],
    },
    {
      id: "payment",
      header: "Pagamento",
      cell: (sale) => (
        <span>
          {PAYMENT_LABELS[sale.paymentMethod]}
          {sale.installments > 1 ? (
            <span className="text-muted-foreground"> · {sale.installments}x</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "items",
      header: "Peças",
      align: "right",
      cell: (sale) => formatNumber(pieces(sale)),
    },
    {
      id: "discount",
      header: "Desconto",
      align: "right",
      hideOnMobile: true,
      cell: (sale) =>
        sale.discount > 0 ? (
          <span className="text-critical">− {formatBRL(sale.discount)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (sale) => (
        <span className="font-medium">{formatBRL(sale.total)}</span>
      ),
    },
    {
      id: "profit",
      header: "Lucro",
      align: "right",
      cell: (sale) => {
        const profit = sale.total - sale.totalCost;
        return (
          <span
            className={cn(profit >= 0 ? "text-success-text" : "text-critical")}
          >
            {formatBRL(profit)}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Situação",
      cell: (sale) => <SaleStatusBadge status={sale.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendas"
        description={`${PERIOD_LABELS[filters.period]} · ${formatNumber(rows.length)} ${
          rows.length === 1 ? "venda encontrada" : "vendas encontradas"
        }`}
        actions={
          <Button onClick={() => router.push("/vendas/nova")}>
            <Plus />
            Nova venda
          </Button>
        }
      />

      <section
        aria-label="Indicadores do período"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Faturamento"
          value={formatBRL(summary.revenue)}
          icon={CircleDollarSign}
          hint="Soma das vendas finalizadas do recorte — canceladas e devolvidas ficam de fora."
        />
        <StatCard
          label="Vendas"
          value={formatNumber(summary.salesCount)}
          icon={ShoppingBag}
        />
        <StatCard
          label="Ticket médio"
          value={formatBRL(summary.ticket)}
          icon={TicketPercent}
        />
        <StatCard
          label="Peças vendidas"
          value={formatNumber(summary.pieces)}
          icon={Shirt}
        />
      </section>

      <SalesFiltersBar
        filters={filters}
        onChange={setFilters}
        sellers={state.sellers}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(sale) => sale.id}
        onRowClick={(sale) => router.push(`/vendas/${sale.id}`)}
        emptyState={
          <EmptyState
            icon={ShoppingBag}
            title="Nenhuma venda neste recorte"
            description={
              activeFilters > 0
                ? "Os filtros aplicados não trouxeram resultados. Limpe os filtros ou amplie o período."
                : "Não há vendas registradas no período escolhido. Experimente um período maior ou registre a primeira venda."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {activeFilters > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(DEFAULT_SALES_FILTERS)}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => router.push("/vendas/nova")}>
                  <Plus />
                  Nova venda
                </Button>
              </div>
            }
          />
        }
      />
    </div>
  );
}
