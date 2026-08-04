"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { QuantityStepper } from "./quantity-stepper";
import type { CartItem } from "./sale-totals";

/** Lista de itens do carrinho, com quantidade editável e remoção. */
export function CartList({
  items,
  onQuantityChange,
  onRemove,
}: {
  items: CartItem[];
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <ShoppingCart className="size-5" />
        </div>
        <p className="mt-1 text-sm font-medium">Carrinho vazio</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Busque a peça pelo nome ou passe o código de barras para adicionar o
          primeiro item.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y" aria-label="Itens do carrinho">
      {items.map((item) => (
        <li key={item.variantId} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.color} · Tam. {item.size} · {formatBRL(item.unitPrice)} un
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 text-muted-foreground hover:text-destructive lg:size-9"
              aria-label={`Remover ${item.name} ${item.color} tamanho ${item.size} do carrinho`}
              onClick={() => onRemove(item.variantId)}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <QuantityStepper
              value={item.quantity}
              max={item.stock}
              onChange={(quantity) => onQuantityChange(item.variantId, quantity)}
              label={`de ${item.name} ${item.color} tamanho ${item.size}`}
            />
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">
                {formatBRL(item.unitPrice * item.quantity)}
              </p>
              {item.quantity >= item.stock ? (
                <p className="text-[11px] text-[#8a6100] dark:text-warning">
                  Estoque no limite ({item.stock})
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
