"use client";

import * as React from "react";
import { Check, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatBRL, formatNumber } from "@/lib/format";
import type { ProductSize } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CatalogSheet } from "./catalog-sheet";
import { sizesForColor, type CatalogItem } from "./catalog-data";
import { PriceTag } from "./product-card";
import { ColorSwatch, ProductMedia, productImage } from "./product-media";
import { buildSingleItemMessage, openWhatsapp } from "./share";
import { useWishlist, wishlistItemId } from "./wishlist";

/**
 * Detalhe da peça. A cliente escolhe cor e tamanho aqui — a escolha viaja
 * junto na mensagem do WhatsApp, que é o que evita a conversa de ida e volta
 * perguntando "qual tamanho?".
 */
export function ProductDetailSheet({
  item,
  open,
  onOpenChange,
  showPrices,
  storeName,
  whatsapp,
}: {
  item: CatalogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showPrices: boolean;
  storeName: string;
  whatsapp: string;
}) {
  const wishlist = useWishlist();
  const [color, setColor] = React.useState(item.colors[0]?.name ?? "");
  const availableSizes = sizesForColor(item, color);
  const [size, setSize] = React.useState<ProductSize | null>(
    availableSizes[0] ?? null
  );

  const chooseColor = (next: string) => {
    setColor(next);
    const sizes = sizesForColor(item, next);
    setSize((current) =>
      current && sizes.includes(current) ? current : (sizes[0] ?? null)
    );
  };

  const canOrder = color !== "" && size !== null;
  const selection = canOrder
    ? {
        id: wishlistItemId(item.product.id, color, size),
        productId: item.product.id,
        name: item.product.name,
        category: item.product.category,
        color,
        size,
        price: item.price,
        quantity: 1,
      }
    : null;

  const handleAdd = () => {
    if (!selection) return;
    wishlist.add({
      productId: selection.productId,
      name: selection.name,
      category: selection.category,
      color: selection.color,
      size: selection.size,
      price: selection.price,
    });
    toast.success("Peça adicionada à sua lista", {
      description: `${item.product.name} · ${color} · ${size}`,
    });
    onOpenChange(false);
  };

  const handleWhatsapp = () => {
    if (!selection) return;
    openWhatsapp(
      whatsapp,
      buildSingleItemMessage({ storeName, item: selection, showPrices })
    );
  };

  return (
    <CatalogSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item.product.name}
      description={`${item.product.category} · ${item.product.collection}`}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            className="h-12 flex-1"
            onClick={handleAdd}
            disabled={!canOrder}
          >
            <Plus /> Adicionar à lista
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 flex-1"
            onClick={handleWhatsapp}
            disabled={!canOrder || whatsapp.trim() === ""}
          >
            <MessageCircle /> Pedir no WhatsApp
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="relative">
          <ProductMedia
            name={item.product.name}
            color={color || item.colors[0]?.name}
            image={productImage(item.product)}
            className="aspect-[4/3] w-full rounded-xl"
            compact
          />
          <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1">
            {item.hasPromo ? <Badge>-{item.discountPercent}%</Badge> : null}
            {item.isLastPieces ? (
              <Badge variant="warning">Últimas peças</Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <PriceTag item={item} showPrices={showPrices} size="lg" />
          <p className="text-xs text-muted-foreground">
            {formatNumber(item.stock)}{" "}
            {item.stock === 1 ? "peça disponível" : "peças disponíveis"}
          </p>
        </div>

        {showPrices && item.hasPromo ? (
          <p className="text-xs font-medium text-success-text">
            Você economiza {formatBRL(item.listPrice - item.price)} nesta peça.
          </p>
        ) : null}

        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.product.description}
        </p>

        <Separator />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Cor
            {color ? (
              <span className="ml-1 font-normal text-muted-foreground">
                · {color}
              </span>
            ) : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {item.colors.map((entry) => {
              const active = entry.name === color;
              return (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => chooseColor(entry.name)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    active
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-input bg-card hover:bg-secondary"
                  )}
                >
                  <ColorSwatch color={entry.name} />
                  {entry.name}
                  {active ? <Check className="size-3.5" /> : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tamanho</legend>
          <div className="flex flex-wrap gap-2">
            {item.sizes.map((option) => {
              const available = availableSizes.includes(option);
              const active = option === size;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={!available}
                  onClick={() => setSize(option)}
                  aria-pressed={active}
                  aria-label={
                    available
                      ? `Tamanho ${option}`
                      : `Tamanho ${option} indisponível nesta cor`
                  }
                  className={cn(
                    "inline-flex size-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition-colors",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:bg-secondary",
                    !available &&
                      "cursor-not-allowed border-dashed bg-muted text-muted-foreground/60 line-through hover:bg-muted"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Tamanhos riscados estão esgotados nesta cor.
          </p>
        </fieldset>

        <Separator />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Material</dt>
            <dd className="font-medium">{item.product.material}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Coleção</dt>
            <dd className="font-medium">{item.product.collection}</dd>
          </div>
        </dl>
      </div>
    </CatalogSheet>
  );
}
