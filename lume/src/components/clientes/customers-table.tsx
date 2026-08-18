"use client";

import { MessageCircle, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/data-table";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";
import type { CustomerStats } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_SEGMENT_LABELS,
  CUSTOMER_SEGMENT_VARIANT,
} from "./segments";

/** Tabela da lista de clientes — vira cartões no celular pelo DataTable. */
export function CustomersTable({
  rows,
  onSelect,
  onMessage,
  onContact,
  emptyState,
}: {
  rows: CustomerStats[];
  onSelect: (stat: CustomerStats) => void;
  onMessage: (stat: CustomerStats) => void;
  onContact: (stat: CustomerStats) => void;
  emptyState?: React.ReactNode;
}) {
  const columns: Column<CustomerStats>[] = [
    {
      id: "nome",
      header: "Cliente",
      primary: true,
      cell: (stat) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{stat.customer.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {stat.customer.city || "Cidade não informada"}
          </p>
        </div>
      ),
    },
    {
      id: "telefone",
      header: "Telefone",
      secondary: true,
      cell: (stat) => (
        <span className="whitespace-nowrap tabular-nums">
          {stat.customer.phone}
        </span>
      ),
    },
    {
      id: "ultima",
      header: "Última compra",
      cell: (stat) =>
        stat.lastPurchase ? (
          <span className="whitespace-nowrap">
            {formatDate(stat.lastPurchase)}
            <span
              className={cn(
                "ml-1.5 text-xs",
                (stat.daysSinceLastPurchase ?? 0) > 120
                  ? "text-critical"
                  : "text-muted-foreground"
              )}
            >
              há {formatNumber(stat.daysSinceLastPurchase ?? 0)} dias
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Ainda não comprou</span>
        ),
    },
    {
      id: "total",
      header: "Total gasto",
      align: "right",
      cell: (stat) => formatBRL(stat.totalSpent),
    },
    {
      id: "compras",
      header: "Compras",
      align: "right",
      cell: (stat) => formatNumber(stat.purchases),
    },
    {
      id: "ticket",
      header: "Ticket médio",
      align: "right",
      cell: (stat) => (stat.purchases > 0 ? formatBRL(stat.ticket) : "—"),
    },
    {
      id: "saldo",
      header: "Saldo em aberto",
      align: "right",
      cell: (stat) =>
        stat.openBalance > 0 ? (
          <span className="font-medium text-critical">
            {formatBRL(stat.openBalance)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "segmento",
      header: "Segmento",
      cell: (stat) => (
        <Badge variant={CUSTOMER_SEGMENT_VARIANT[stat.segment]}>
          {CUSTOMER_SEGMENT_LABELS[stat.segment]}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(stat) => stat.customer.id}
      onRowClick={onSelect}
      emptyState={emptyState}
      actions={(stat) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="outline"
            size="sm"
            aria-label={`Enviar mensagem para ${stat.customer.name}`}
            onClick={() => onMessage(stat)}
          >
            <MessageCircle />
            <span className="md:hidden">Enviar mensagem</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Registrar contato com ${stat.customer.name}`}
            onClick={() => onContact(stat)}
          >
            <NotebookPen />
            <span className="md:hidden">Registrar contato</span>
          </Button>
        </div>
      )}
    />
  );
}
