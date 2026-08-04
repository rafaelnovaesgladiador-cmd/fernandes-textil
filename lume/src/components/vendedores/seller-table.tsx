"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/data-table";
import { formatBRL, formatNumber, formatPercent, initials } from "@/lib/format";
import type { SellerPerformance } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { returnRate } from "./seller-highlights";

/** Comparativo lado a lado — mesma tabela vira cartões no celular. */
export function SellerTable({ data }: { data: SellerPerformance[] }) {
  const columns: Column<SellerPerformance>[] = [
    {
      id: "vendedora",
      header: "Vendedora",
      primary: true,
      cell: (entry) => (
        <span className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback
              className="text-[10px] text-white"
              style={{ backgroundColor: entry.seller.avatarColor }}
            >
              {initials(entry.seller.name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{entry.seller.name}</span>
        </span>
      ),
    },
    {
      id: "faturamento",
      header: "Faturamento",
      align: "right",
      cell: (entry) => formatBRL(entry.revenue),
    },
    {
      id: "vendas",
      header: "Vendas",
      align: "right",
      cell: (entry) => formatNumber(entry.salesCount),
    },
    {
      id: "ticket",
      header: "Ticket médio",
      align: "right",
      cell: (entry) => formatBRL(entry.ticket),
    },
    {
      id: "pecas",
      header: "Peças",
      align: "right",
      cell: (entry) => formatNumber(entry.pieces),
    },
    {
      id: "lucro",
      header: "Lucro gerado",
      align: "right",
      cell: (entry) => formatBRL(entry.profit),
    },
    {
      id: "margem",
      header: "Margem",
      align: "right",
      cell: (entry) => formatPercent(entry.margin, 1),
    },
    {
      id: "desconto",
      header: "Desconto médio",
      align: "right",
      cell: (entry) => (
        <span className={cn(entry.discountAverage > 8 && "text-critical")}>
          {formatPercent(entry.discountAverage, 1)}
        </span>
      ),
    },
    {
      id: "meta",
      header: "Meta",
      align: "right",
      cell: (entry) => formatPercent(entry.goalPercent),
    },
    {
      id: "clientes",
      header: "Clientes",
      align: "right",
      cell: (entry) => formatNumber(entry.customersServed),
    },
    {
      id: "devolucoes",
      header: "Devoluções",
      align: "right",
      cell: (entry) =>
        entry.returns > 0
          ? `${formatNumber(entry.returns)} · ${formatPercent(returnRate(entry), 1)}`
          : "—",
    },
    {
      id: "comissao",
      header: "Comissão",
      align: "right",
      cell: (entry) => (
        <span className="font-medium">{formatBRL(entry.commission)}</span>
      ),
    },
  ];

  return (
    <section aria-label="Comparativo da equipe" className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold">Comparativo da equipe</h2>
        <p className="text-sm text-muted-foreground">
          Todas as métricas do período lado a lado — leia as colunas em conjunto,
          não isoladamente.
        </p>
      </div>
      <DataTable
        rows={data}
        columns={columns}
        getRowId={(entry) => entry.seller.id}
      />
    </section>
  );
}
