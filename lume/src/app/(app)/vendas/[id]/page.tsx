"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, Share2, ShoppingBag, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { useConfirm } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SaleStatusBadge } from "@/components/vendas/sale-status-badge";
import {
  ShareReceiptDialog,
  buildReceiptText,
  paymentSummary,
  type ReceiptData,
} from "@/components/vendas/receipt";
import { useStore } from "@/hooks/use-store";
import { DEMO_TODAY } from "@/lib/dates";
import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { changeSaleStatus } from "@/lib/store";
import { CHANNEL_LABELS, type SaleItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Detalhe da venda: itens, resultado financeiro, crediário e ações. */
export default function VendaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const state = useStore();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [shareOpen, setShareOpen] = useState(false);

  const saleId = typeof params.id === "string" ? params.id : "";
  const sale = state.sales.find((item) => item.id === saleId);

  const productById = useMemo(
    () => new Map(state.products.map((p) => [p.id, p])),
    [state.products]
  );
  const variantById = useMemo(
    () => new Map(state.variants.map((v) => [v.id, v])),
    [state.variants]
  );

  const receivables = useMemo(
    () =>
      state.receivables
        .filter((receivable) => receivable.saleId === saleId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [state.receivables, saleId]
  );

  if (!sale) {
    return (
      <div className="space-y-5">
        <PageHeader title="Venda não encontrada" />
        <EmptyState
          icon={ShoppingBag}
          title="Esta venda não existe mais"
          description="O código pode ter sido digitado errado ou a venda foi removida da base de demonstração."
          action={
            <Button size="sm" onClick={() => router.push("/vendas")}>
              <ArrowLeft />
              Voltar para o histórico
            </Button>
          }
        />
      </div>
    );
  }

  const customer = sale.customerId
    ? state.customers.find((c) => c.id === sale.customerId)
    : undefined;
  const seller = state.sellers.find((s) => s.id === sale.sellerId);

  const pieces = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = sale.total + sale.discount;
  const profit = sale.total - sale.totalCost;
  const margin = sale.total > 0 ? (profit / sale.total) * 100 : 0;
  const closed = sale.status === "cancelada" || sale.status === "devolvida";

  const describe = (item: SaleItem) => {
    const variant = variantById.get(item.variantId);
    return variant ? `${variant.color} · Tam. ${variant.size}` : "—";
  };

  const receipt: ReceiptData = {
    code: sale.code,
    date: sale.date,
    storeName: state.company.tradeName,
    items: sale.items.map((item) => {
      const variant = variantById.get(item.variantId);
      return {
        name: productById.get(item.productId)?.name ?? "Produto",
        color: variant?.color ?? "—",
        size: variant?.size ?? "—",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    }),
    subtotal,
    discount: sale.discount,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    installments: sale.installments,
    sellerName: seller?.name ?? "—",
    customerName: customer?.name,
    channel: sale.channel,
  };

  const itemColumns: Column<SaleItem>[] = [
    {
      id: "product",
      header: "Produto",
      primary: true,
      cell: (item) => productById.get(item.productId)?.name ?? "Produto removido",
    },
    {
      id: "variant",
      header: "Cor e tamanho",
      secondary: true,
      cell: (item) => describe(item),
    },
    {
      id: "quantity",
      header: "Qtd.",
      align: "right",
      cell: (item) => formatNumber(item.quantity),
    },
    {
      id: "unitPrice",
      header: "Preço unitário",
      align: "right",
      cell: (item) => formatBRL(item.unitPrice),
    },
    {
      id: "subtotal",
      header: "Subtotal",
      align: "right",
      cell: (item) => (
        <span className="font-medium">
          {formatBRL(item.unitPrice * item.quantity)}
        </span>
      ),
    },
  ];

  const askCancel = () =>
    confirm({
      title: `Cancelar a venda ${sale.code}?`,
      description:
        "As peças voltam para o estoque e as parcelas em aberto do crediário deixam de ser cobradas. A venda sai do faturamento do período.",
      confirmLabel: "Cancelar venda",
      destructive: true,
      onConfirm: () => {
        changeSaleStatus(sale.id, "cancelada");
        toast.success(`Venda ${sale.code} cancelada`, {
          description: "O estoque das peças foi reposto.",
        });
      },
    });

  const askReturn = () =>
    confirm({
      title: `Registrar devolução da venda ${sale.code}?`,
      description:
        "As peças voltam para o estoque como devolução e o valor sai do faturamento. Use quando a cliente devolveu as peças da venda inteira.",
      confirmLabel: "Registrar devolução",
      destructive: true,
      onConfirm: () => {
        changeSaleStatus(sale.id, "devolvida");
        toast.success(`Devolução da venda ${sale.code} registrada`, {
          description: "O estoque das peças foi reposto.",
        });
      },
    });

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Venda ${sale.code}`}
        description={`${formatDateTime(sale.date)} · ${pieces} ${
          pieces === 1 ? "peça" : "peças"
        } · ${formatBRL(sale.total)}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/vendas")}
            >
              <ArrowLeft />
              Histórico
            </Button>
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <Share2 />
              Compartilhar comprovante
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SaleStatusBadge status={sale.status} />
        <Badge variant="secondary">{CHANNEL_LABELS[sale.channel]}</Badge>
        <Badge variant="secondary">
          {paymentSummary(sale.paymentMethod, sale.installments)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section aria-label="Itens da venda" className="space-y-2">
            <h2 className="text-sm font-semibold">
              Itens da venda ({sale.items.length})
            </h2>
            <DataTable
              rows={sale.items}
              columns={itemColumns}
              getRowId={(item) => item.id}
            />
          </section>

          {receivables.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Parcelas do crediário</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {receivables.map((receivable, index) => {
                    const overdue =
                      receivable.status !== "recebido" &&
                      new Date(receivable.dueDate).getTime() <
                        DEMO_TODAY.getTime();
                    return (
                      <li
                        key={receivable.id}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            Parcela {index + 1}/{receivables.length}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence em {formatDate(receivable.dueDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium tabular-nums">
                            {formatBRL(receivable.amount)}
                          </span>
                          <Badge
                            variant={
                              receivable.status === "recebido"
                                ? "success"
                                : overdue
                                  ? "critical"
                                  : "secondary"
                            }
                          >
                            {receivable.status === "recebido"
                              ? "Recebido"
                              : overdue
                                ? "Vencido"
                                : "Em aberto"}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados da venda</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Cliente">
                  {customer ? (
                    <button
                      type="button"
                      onClick={() => router.push("/clientes")}
                      className="text-right underline-offset-4 hover:underline cursor-pointer"
                    >
                      {customer.name}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Sem cliente</span>
                  )}
                </Row>
                <Row label="Vendedora">{seller?.name ?? "—"}</Row>
                <Row label="Canal">{CHANNEL_LABELS[sale.channel]}</Row>
                <Row label="Pagamento">
                  {paymentSummary(sale.paymentMethod, sale.installments)}
                </Row>
                <Row label="Parcelas">
                  {sale.installments}x
                  {sale.installments > 1
                    ? ` de ${formatBRL(sale.total / sale.installments)}`
                    : ""}
                </Row>
                <Row label="Data">{formatDateTime(sale.date)}</Row>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultado da venda</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Subtotal">{formatBRL(subtotal)}</Row>
                <Row label="Desconto">
                  <span className={cn(sale.discount > 0 && "text-critical")}>
                    {sale.discount > 0
                      ? `− ${formatBRL(sale.discount)}`
                      : formatBRL(0)}
                  </span>
                </Row>
                <div className="flex items-baseline justify-between border-t pt-2">
                  <dt className="font-medium">Total</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {formatBRL(sale.total)}
                  </dd>
                </div>
                <Row label="Custo das mercadorias">
                  {formatBRL(sale.totalCost)}
                </Row>
                <div className="flex items-baseline justify-between border-t pt-2">
                  <dt className="font-medium">Lucro da venda</dt>
                  <dd
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      profit >= 0 ? "text-success-text" : "text-critical"
                    )}
                  >
                    {formatBRL(profit)}
                  </dd>
                </div>
                <Row label="Margem">{formatPercent(margin, 1)}</Row>
              </dl>
              {closed ? (
                <p className="mt-3 rounded-lg bg-secondary p-2.5 text-xs text-muted-foreground">
                  Venda {sale.status === "cancelada" ? "cancelada" : "devolvida"}
                  : os valores acima não entram no faturamento do período.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="h-11 w-full justify-start"
                disabled={closed}
                onClick={askReturn}
              >
                <Undo2 />
                Registrar devolução
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full justify-start text-destructive hover:text-destructive"
                disabled={closed}
                onClick={askCancel}
              >
                <Ban />
                Cancelar venda
              </Button>
              <p className="text-xs text-muted-foreground">
                {closed
                  ? "Esta venda já foi encerrada — as peças voltaram para o estoque."
                  : "Nos dois casos as peças voltam para o estoque e o valor sai do faturamento."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ShareReceiptDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        whatsapp={customer?.whatsapp}
        text={buildReceiptText(receipt)}
      />

      {confirmDialog}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right tabular-nums">{children}</dd>
    </div>
  );
}
