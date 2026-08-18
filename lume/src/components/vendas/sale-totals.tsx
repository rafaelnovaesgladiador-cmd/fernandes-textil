"use client";

import { formatBRL, formatPercent } from "@/lib/format";
import type { ProductSize } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Item do carrinho da nova venda (uma variação por linha). */
export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  color: string;
  size: ProductSize;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  /** Estoque disponível da variação no momento do cálculo. */
  stock: number;
}

export type DiscountMode = "reais" | "percent";

export interface SaleTotals {
  /** Soma dos itens, antes do desconto. */
  gross: number;
  discount: number;
  discountPercent: number;
  total: number;
  pieces: number;
}

/** Aceita "89,90" e "89.90" — o teclado do celular manda os dois. */
export function parseAmount(input: string): number {
  const normalized = input.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function computeSaleTotals(
  items: CartItem[],
  discountMode: DiscountMode,
  discountInput: string
): SaleTotals {
  const gross = round(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );
  const raw =
    discountMode === "reais"
      ? parseAmount(discountInput)
      : (gross * Math.min(parseAmount(discountInput), 100)) / 100;
  const discount = round(Math.min(raw, gross));
  return {
    gross,
    discount,
    discountPercent: gross > 0 ? (discount / gross) * 100 : 0,
    total: round(gross - discount),
    pieces: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/** Resumo subtotal / desconto / total usado no carrinho e no comprovante. */
export function SaleTotalsSummary({
  totals,
  className,
}: {
  totals: SaleTotals;
  className?: string;
}) {
  return (
    <dl className={cn("space-y-1.5 text-sm", className)}>
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">
          Subtotal
          {totals.pieces > 0 ? (
            <span className="ml-1 text-xs">
              ({totals.pieces} {totals.pieces === 1 ? "peça" : "peças"})
            </span>
          ) : null}
        </dt>
        <dd className="tabular-nums">{formatBRL(totals.gross)}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">
          Desconto
          {totals.discount > 0 ? (
            <span className="ml-1 text-xs">
              ({formatPercent(totals.discountPercent, 1)})
            </span>
          ) : null}
        </dt>
        <dd
          className={cn(
            "tabular-nums",
            totals.discount > 0 && "text-critical"
          )}
        >
          {totals.discount > 0 ? `− ${formatBRL(totals.discount)}` : formatBRL(0)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t pt-2">
        <dt className="font-medium">Total</dt>
        <dd className="text-xl font-semibold tabular-nums">
          {formatBRL(totals.total)}
        </dd>
      </div>
    </dl>
  );
}
