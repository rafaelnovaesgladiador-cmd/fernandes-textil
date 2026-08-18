"use client";

import { ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";
import { CHANNEL_LABELS, SALE_STATUS_LABELS, type Sale } from "@/lib/types";

const STATUS_VARIANT = {
  finalizada: "success",
  em_andamento: "outline",
  cancelada: "critical",
  trocada: "secondary",
  devolvida: "warning",
  parcialmente_devolvida: "warning",
} as const;

/** Histórico de compras da cliente, com atalho para a venda completa. */
export function CustomerPurchases({
  sales,
  onSelect,
}: {
  sales: Sale[];
  onSelect: (sale: Sale) => void;
}) {
  const columns: Column<Sale>[] = [
    {
      id: "codigo",
      header: "Venda",
      primary: true,
      cell: (sale) => <span className="font-medium">{sale.code}</span>,
    },
    {
      id: "data",
      header: "Data",
      secondary: true,
      cell: (sale) => (
        <span className="whitespace-nowrap">
          {formatDate(sale.date)} · {CHANNEL_LABELS[sale.channel]}
        </span>
      ),
    },
    {
      id: "itens",
      header: "Peças",
      align: "right",
      cell: (sale) =>
        formatNumber(sale.items.reduce((sum, item) => sum + item.quantity, 0)),
    },
    {
      id: "desconto",
      header: "Desconto",
      align: "right",
      cell: (sale) =>
        sale.discount > 0 ? formatBRL(sale.discount) : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (sale) => <span className="font-medium">{formatBRL(sale.total)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (sale) => (
        <Badge variant={STATUS_VARIANT[sale.status]}>
          {SALE_STATUS_LABELS[sale.status]}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      rows={sales}
      columns={columns}
      getRowId={(sale) => sale.id}
      onRowClick={onSelect}
      emptyState={
        <EmptyState
          icon={ShoppingBag}
          title="Nenhuma compra registrada"
          description="Quando esta cliente comprar, o histórico aparece aqui com peças, descontos e forma de pagamento."
        />
      }
    />
  );
}
