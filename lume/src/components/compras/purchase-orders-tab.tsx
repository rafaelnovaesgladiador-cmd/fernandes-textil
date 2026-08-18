"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarCheck,
  ClipboardList,
  PackageCheck,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/components/confirm-dialog";
import { PurchaseDetailDialog } from "@/components/compras/purchase-detail-dialog";
import { PurchaseStatusBadge } from "@/components/compras/purchase-status-badge";
import { formatBRL, formatNumber, formatDate } from "@/lib/format";
import { resolvePeriod } from "@/lib/metrics";
import { receivePurchase, type AppState } from "@/lib/store";
import {
  PURCHASE_STATUS_LABELS,
  type Purchase,
  type PurchaseStatus,
} from "@/lib/types";

type StatusFilter = PurchaseStatus | "todos";

/** Aba de pedidos: indicadores, listagem, recebimento e detalhe do pedido. */
export function PurchaseOrdersTab({ state }: { state: AppState }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [selected, setSelected] = useState<Purchase | null>(null);

  const supplierById = useMemo(
    () => new Map(state.suppliers.map((s) => [s.id, s])),
    [state.suppliers]
  );

  const stats = useMemo(() => {
    const monthRange = resolvePeriod("mes").current;
    const open = state.purchases.filter(
      (p) => p.status === "pedido" || p.status === "rascunho"
    );
    const receivedThisMonth = state.purchases.filter((p) => {
      if (p.status !== "recebido" || !p.receivedAt) return false;
      const time = new Date(p.receivedAt).getTime();
      return (
        time >= monthRange.from.getTime() && time < monthRange.to.getTime()
      );
    });
    const activeSuppliers = new Set(
      state.products.filter((p) => p.status === "ativo").map((p) => p.supplierId)
    );
    return {
      openCount: open.length,
      openValue: open.reduce((sum, p) => sum + p.total, 0),
      receivedCount: receivedThisMonth.length,
      receivedValue: receivedThisMonth.reduce((sum, p) => sum + p.total, 0),
      activeSuppliers: activeSuppliers.size,
    };
  }, [state.products, state.purchases]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.purchases
      .filter((purchase) => {
        if (status !== "todos" && purchase.status !== status) return false;
        if (!query) return true;
        const supplier = supplierById.get(purchase.supplierId)?.name ?? "";
        return (
          purchase.code.toLowerCase().includes(query) ||
          supplier.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [search, state.purchases, status, supplierById]);

  const askReceive = (purchase: Purchase) => {
    const pieces = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
    confirm({
      title: `Receber o pedido ${purchase.code}?`,
      description: `As ${formatNumber(pieces)} peças entram no estoque agora, cada variação ganha uma movimentação de entrada e ${
        purchase.installments
      } ${purchase.installments === 1 ? "duplicata" : "duplicatas"} de ${formatBRL(
        purchase.total / Math.max(1, purchase.installments)
      )} são geradas no contas a pagar. Esta ação não pode ser desfeita.`,
      confirmLabel: "Receber e dar entrada",
      onConfirm: () => {
        receivePurchase(purchase.id);
        setSelected(null);
        toast.success(`Pedido ${purchase.code} recebido`, {
          description: `${formatNumber(pieces)} peças no estoque · ${
            purchase.installments
          }x no contas a pagar.`,
        });
      },
    });
  };

  const columns: Column<Purchase>[] = [
    {
      id: "code",
      header: "Código",
      primary: true,
      cell: (row) => <span className="font-medium">{row.code}</span>,
    },
    {
      id: "supplier",
      header: "Fornecedor",
      secondary: true,
      cell: (row) => supplierById.get(row.supplierId)?.name ?? "—",
    },
    {
      id: "date",
      header: "Data",
      cell: (row) => formatDate(row.date),
    },
    {
      id: "items",
      header: "Itens",
      align: "right",
      cell: (row) => {
        const pieces = row.items.reduce((sum, item) => sum + item.quantity, 0);
        return `${formatNumber(row.items.length)} · ${formatNumber(pieces)} pçs`;
      },
    },
    {
      id: "total",
      header: "Valor total",
      align: "right",
      cell: (row) => (
        <span className="font-medium">{formatBRL(row.total)}</span>
      ),
    },
    {
      id: "installments",
      header: "Parcelas",
      align: "right",
      cell: (row) => `${row.installments}x`,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <PurchaseStatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <section
        aria-label="Indicadores de compras"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Pedidos em aberto"
          value={formatNumber(stats.openCount)}
          icon={ClipboardList}
          hint="Pedidos enviados ao fornecedor que ainda não foram recebidos."
        />
        <StatCard
          label="Valor em aberto"
          value={formatBRL(stats.openValue)}
          icon={Wallet}
          hint="Compromisso que vira contas a pagar assim que a mercadoria chegar."
        />
        <StatCard
          label="Recebidos no mês"
          value={formatNumber(stats.receivedCount)}
          icon={CalendarCheck}
          hint={`${formatBRL(stats.receivedValue)} em mercadoria que entrou no estoque neste mês.`}
        />
        <StatCard
          label="Fornecedores ativos"
          value={formatNumber(stats.activeSuppliers)}
          icon={Users}
          hint="Fornecedores com pelo menos um produto ativo no catálogo."
        />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código ou fornecedor…"
          aria-label="Buscar pedidos de compra"
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(PURCHASE_STATUS_LABELS) as PurchaseStatus[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {PURCHASE_STATUS_LABELS[key]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelected(row)}
        actions={(row) =>
          row.status === "pedido" ? (
            <Button size="sm" variant="outline" onClick={() => askReceive(row)}>
              <PackageCheck /> Receber pedido
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>
              Ver itens
            </Button>
          )
        }
        emptyState={
          <EmptyState
            icon={Truck}
            title={
              state.purchases.length === 0
                ? "Nenhum pedido de compra ainda"
                : "Nenhum pedido neste recorte"
            }
            description={
              state.purchases.length === 0
                ? "Crie o primeiro pedido para um fornecedor: ao receber, o estoque e o contas a pagar são atualizados automaticamente."
                : "Ajuste a busca ou o filtro de status para ver outros pedidos."
            }
            action={
              state.purchases.length === 0 ? (
                <Button size="sm" onClick={() => router.push("/compras/nova")}>
                  <Truck /> Novo pedido
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatus("todos");
                  }}
                >
                  Limpar filtros
                </Button>
              )
            }
          />
        }
      />

      <PurchaseDetailDialog
        purchase={selected}
        state={state}
        onOpenChange={(open) => !open && setSelected(null)}
        onReceive={(purchase) => {
          // Fecha o detalhe no mesmo commit em que a confirmação abre,
          // evitando duas camadas modais empilhadas.
          setSelected(null);
          askReceive(purchase);
        }}
      />
      {dialog}
    </div>
  );
}
