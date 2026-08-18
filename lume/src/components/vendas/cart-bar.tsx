"use client";

import { ChevronUp, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

/**
 * Barra fixa do celular: total e finalizar sempre à mão, acima da navegação.
 * Tocar na área esquerda abre a gaveta com o carrinho e o pagamento.
 */
export function CartBar({
  count,
  total,
  onOpen,
  onSubmit,
}: {
  count: number;
  total: number;
  onOpen: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Abrir carrinho com ${count} ${count === 1 ? "peça" : "peças"}`}
          className="flex min-h-12 flex-1 items-center gap-2.5 rounded-lg px-2 text-left transition-colors outline-none cursor-pointer hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="relative shrink-0">
            <ShoppingCart className="size-5" />
            {count > 0 ? (
              <span className="absolute -right-2 -top-2 flex size-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
                {count}
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] text-muted-foreground">
              {count === 0
                ? "Carrinho vazio"
                : `${count} ${count === 1 ? "peça" : "peças"} · revisar e pagar`}
            </span>
            <span className="block text-base font-semibold tabular-nums">
              {formatBRL(total)}
            </span>
          </span>
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        </button>
        <Button type="button" className="h-12 shrink-0 px-4" onClick={onSubmit}>
          Finalizar
        </Button>
      </div>
    </div>
  );
}
