"use client";

import { useMemo } from "react";
import { PackageCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PurchaseStatusBadge } from "@/components/compras/purchase-status-badge";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";
import type { AppState } from "@/lib/store";
import type { Purchase } from "@/lib/types";

/**
 * Detalhe do pedido: itens com variação, custo unitário e subtotal.
 * O recebimento fica disponível aqui e na listagem — mesma ação, mesmo efeito.
 */
export function PurchaseDetailDialog({
  purchase,
  state,
  onOpenChange,
  onReceive,
}: {
  purchase: Purchase | null;
  state: AppState;
  onOpenChange: (open: boolean) => void;
  onReceive: (purchase: Purchase) => void;
}) {
  const rows = useMemo(() => {
    if (!purchase) return [];
    const productById = new Map(state.products.map((p) => [p.id, p]));
    const variantById = new Map(state.variants.map((v) => [v.id, v]));
    return purchase.items.map((item) => {
      const product = productById.get(item.productId);
      const variant = variantById.get(item.variantId);
      return {
        id: item.id,
        name: product?.name ?? "Produto removido",
        variant: variant ? `${variant.color} · ${variant.size}` : "—",
        sku: variant?.sku ?? product?.sku ?? "",
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: item.unitCost * item.quantity,
      };
    });
  }, [purchase, state.products, state.variants]);

  if (!purchase) return null;

  const supplier = state.suppliers.find((s) => s.id === purchase.supplierId);
  const pieces = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
  const installmentValue = purchase.total / Math.max(1, purchase.installments);

  return (
    <Dialog open={Boolean(purchase)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Pedido {purchase.code}
            <PurchaseStatusBadge status={purchase.status} />
          </DialogTitle>
          <DialogDescription>
            {supplier?.name ?? "Fornecedor"} · {formatDate(purchase.date)} ·{" "}
            {formatNumber(purchase.items.length)}{" "}
            {purchase.items.length === 1 ? "item" : "itens"} ·{" "}
            {formatNumber(pieces)} {pieces === 1 ? "peça" : "peças"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <ul className="divide-y rounded-xl border">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.variant}
                    {row.sku ? ` · ${row.sku}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right text-sm tabular-nums">
                  <span className="text-muted-foreground">
                    {formatNumber(row.quantity)} × {formatBRL(row.unitCost)}
                  </span>
                  <span className="w-24 font-medium">{formatBRL(row.subtotal)}</span>
                </div>
              </li>
            ))}
          </ul>

          <Separator />

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Total do pedido</dt>
              <dd className="font-semibold tabular-nums">
                {formatBRL(purchase.total)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Condição</dt>
              <dd className="tabular-nums">
                {purchase.installments}x de {formatBRL(installmentValue)}
              </dd>
            </div>
            {purchase.receivedAt ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Recebido em</dt>
                <dd className="tabular-nums">{formatDate(purchase.receivedAt)}</dd>
              </div>
            ) : null}
          </dl>

          {purchase.notes ? (
            <p className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Observações: </span>
              {purchase.notes}
            </p>
          ) : null}

          {purchase.status === "pedido" ? (
            <p className="text-xs text-muted-foreground">
              Ao receber, as {formatNumber(pieces)} peças entram no estoque e as{" "}
              {purchase.installments} duplicatas vão para o contas a pagar.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {purchase.status === "pedido" ? (
            <Button onClick={() => onReceive(purchase)}>
              <PackageCheck /> Receber pedido
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
