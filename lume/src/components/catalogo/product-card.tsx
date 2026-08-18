"use client";

import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogItem } from "./catalog-data";
import { ColorSwatch, ProductMedia, productImage } from "./product-media";

/** Bloco de preço, respeitando a opção "mostrar preços" da loja. */
export function PriceTag({
  item,
  showPrices,
  size = "sm",
}: {
  item: CatalogItem;
  showPrices: boolean;
  size?: "sm" | "lg";
}) {
  if (!showPrices) {
    return (
      <p
        className={cn(
          "font-medium text-muted-foreground",
          size === "lg" ? "text-sm" : "text-xs"
        )}
      >
        Consulte o valor
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {item.hasPromo ? (
        <span
          className={cn(
            "text-muted-foreground line-through",
            size === "lg" ? "text-sm" : "text-xs"
          )}
        >
          {formatBRL(item.listPrice)}
        </span>
      ) : null}
      <span
        className={cn(
          "font-semibold tabular-nums tracking-tight",
          item.hasPromo && "text-primary",
          size === "lg" ? "text-2xl" : "text-sm"
        )}
      >
        {formatBRL(item.price)}
      </span>
    </div>
  );
}

/**
 * Card da grade da vitrine. O card inteiro é o alvo de toque — no celular a
 * cliente não deve precisar acertar um botão pequeno.
 */
export function ProductCard({
  item,
  showPrices,
  onSelect,
  className,
}: {
  item: CatalogItem;
  showPrices: boolean;
  onSelect: (item: CatalogItem) => void;
  className?: string;
}) {
  const cover = item.colors[0]?.name;
  const extraColors = Math.max(0, item.colors.length - 4);

  return (
    <article
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-xs",
        "transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-xs",
        "has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring/60",
        "has-[button:focus-visible]:ring-offset-2 has-[button:focus-visible]:ring-offset-background",
        className
      )}
    >
      <div className="relative">
        <ProductMedia
          name={item.product.name}
          color={cover}
          image={productImage(item.product)}
          className="aspect-[3/4] w-full rounded-none"
        />
        <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
          {item.hasPromo ? (
            <Badge className="shadow-xs">-{item.discountPercent}%</Badge>
          ) : null}
          {item.isLastPieces ? (
            <Badge variant="warning" className="shadow-xs">
              Últimas peças
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {item.product.category}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {item.product.name}
        </h3>

        <div className="mt-auto space-y-2 pt-1">
          <PriceTag item={item} showPrices={showPrices} />

          <div className="flex items-center gap-1">
            {item.colors.slice(0, 4).map((color) => (
              <ColorSwatch key={color.name} color={color.name} />
            ))}
            {extraColors > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                +{extraColors}
              </span>
            ) : null}
            <span className="sr-only">
              Cores: {item.colors.map((color) => color.name).join(", ")}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            <span className="sr-only">Tamanhos disponíveis: </span>
            {item.sizes.join(" · ")}
          </p>
        </div>
      </div>

      {/* O card inteiro é o alvo de toque: no celular a cliente não precisa
          acertar um botão pequeno. */}
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-label={`Ver detalhes de ${item.product.name}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-xl outline-none"
      />
    </article>
  );
}
