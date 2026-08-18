"use client";

import { useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import type { Product, ProductSize, ProductVariant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./quantity-stepper";

const SIZE_ORDER: ProductSize[] = ["P", "M", "G", "GG", "U"];

/** Amostra de cor para reconhecer a peça de relance. */
const COLOR_HEX: Record<string, string> = {
  Preto: "#1b1613",
  Branco: "#ffffff",
  "Off White": "#f2ede3",
  Bege: "#d9c3a5",
  Caramelo: "#a0522d",
  Terracota: "#b5573a",
  Vermelho: "#c0392b",
  Vinho: "#6e1b2e",
  "Rosa Seco": "#d3a3a3",
  "Verde Militar": "#4b5320",
  "Verde Menta": "#a8d5ba",
  "Azul Marinho": "#1f2d55",
  "Azul Claro": "#a9c9e8",
  "Jeans Claro": "#8fb3d9",
  "Jeans Médio": "#5b7fa6",
  "Jeans Escuro": "#2f4a6d",
  Cinza: "#8b8b8b",
  Dourado: "#c9a227",
  Prata: "#c0c0c0",
  Listrado: "#dcdcdc",
};

export function VariantPickerDialog({
  product,
  variants,
  inCart,
  open,
  onOpenChange,
  onConfirm,
}: {
  product: Product | null;
  variants: ProductVariant[];
  /** Quantidade já no carrinho, por id de variação. */
  inCart: Record<string, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (variant: ProductVariant, quantity: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const price = product ? (product.promoPrice ?? product.price) : 0;

  const available = useMemo(() => {
    const map: Record<string, number> = {};
    for (const variant of variants) {
      map[variant.id] = Math.max(0, variant.stock - (inCart[variant.id] ?? 0));
    }
    return map;
  }, [variants, inCart]);

  const byColor = useMemo(() => {
    const groups = new Map<string, ProductVariant[]>();
    for (const variant of variants) {
      const list = groups.get(variant.color) ?? [];
      list.push(variant);
      groups.set(variant.color, list);
    }
    return [...groups.entries()].map(([color, list]) => ({
      color,
      variants: [...list].sort(
        (a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)
      ),
      stock: list.reduce((sum, v) => sum + (available[v.id] ?? 0), 0),
    }));
  }, [variants, available]);

  const options = variants.filter((v) => (available[v.id] ?? 0) > 0);
  // A seleção só vale para o produto aberto; com uma única combinação
  // possível ela já vem pronta — menos um toque no balcão.
  const selected =
    options.find((v) => v.id === selectedId) ??
    (options.length === 1 ? options[0] : null);
  const max = selected ? available[selected.id] ?? 0 : 0;
  const anyAvailable = options.length > 0;
  const amount = Math.min(Math.max(1, quantity), Math.max(1, max));

  const confirm = () => {
    if (!selected) return;
    onConfirm(selected, amount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{product?.name ?? "Escolher variação"}</DialogTitle>
          <DialogDescription>
            {product ? (
              <>
                {formatBRL(price)}
                {product.promoPrice ? (
                  <span className="ml-1.5 line-through opacity-70">
                    {formatBRL(product.price)}
                  </span>
                ) : null}{" "}
                · Escolha a cor e o tamanho.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {!anyAvailable ? (
          <p className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
            Todas as variações desta peça estão sem estoque disponível. Registre
            uma entrada no estoque ou escolha outro produto.
          </p>
        ) : (
          <div className="space-y-4">
            {byColor.map((group) => (
              <div key={group.color}>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-4 shrink-0 rounded-full border"
                    style={{
                      backgroundColor: COLOR_HEX[group.color] ?? "var(--muted)",
                    }}
                  />
                  <span className="text-sm font-medium">{group.color}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.stock > 0
                      ? `${group.stock} disponíveis`
                      : "sem estoque"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.variants.map((variant) => {
                    const left = available[variant.id] ?? 0;
                    const isSelected = variant.id === selected?.id;
                    return (
                      <div
                        key={variant.id}
                        className="flex flex-col items-center gap-1"
                      >
                        <button
                          type="button"
                          disabled={left === 0}
                          aria-pressed={isSelected}
                          aria-label={`${group.color}, tamanho ${variant.size}, ${
                            left === 0 ? "sem estoque" : `${left} em estoque`
                          }`}
                          onClick={() => {
                            setSelectedId(variant.id);
                            setQuantity(1);
                          }}
                          className={cn(
                            "flex size-12 items-center justify-center rounded-lg border text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                            left === 0
                              ? "cursor-not-allowed border-dashed text-muted-foreground/60 line-through"
                              : isSelected
                                ? "cursor-pointer border-primary bg-accent text-accent-foreground ring-2 ring-primary/30"
                                : "cursor-pointer hover:border-primary/40 hover:bg-secondary"
                          )}
                        >
                          {variant.size}
                        </button>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "text-[11px]",
                            left === 0
                              ? "text-muted-foreground/60"
                              : "text-muted-foreground"
                          )}
                        >
                          {left === 0 ? "esgotado" : `${left} un`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/60 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Quantidade</p>
                <p className="text-sm font-medium">
                  {selected
                    ? `${selected.color} · Tam. ${selected.size}`
                    : "Escolha cor e tamanho"}
                </p>
              </div>
              <QuantityStepper
                value={amount}
                onChange={setQuantity}
                max={Math.max(1, max)}
                label={product ? `de ${product.name}` : "do item"}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!selected || max === 0}>
            <ShoppingCart />
            Adicionar {formatBRL(price * amount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
