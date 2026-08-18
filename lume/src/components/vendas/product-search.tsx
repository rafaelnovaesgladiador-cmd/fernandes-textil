"use client";

import { PackageX, ScanLine, Search } from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Produto encontrado na busca, já com preço de venda e estoque somados. */
export interface ProductHit {
  product: Product;
  /** Preço praticado (promoção quando houver). */
  price: number;
  stock: number;
  colors: string[];
}

export function ProductSearch({
  query,
  onQueryChange,
  results,
  onSelect,
  className,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: ProductHit[];
  onSelect: (hit: ProductHit) => void;
  className?: string;
}) {
  const searching = query.trim().length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <SearchInput
          value={query}
          onChange={onQueryChange}
          autoFocus
          aria-label="Buscar produto por nome, SKU ou código de barras"
          placeholder="Buscar por nome, SKU ou código de barras…"
          className="[&_input]:h-12 [&_input]:text-base"
        />
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ScanLine className="size-3.5 shrink-0" />
          Passe o leitor de código de barras: a peça entra direto no carrinho.
        </p>
      </div>

      {!searching ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Search className="size-5" />
          </div>
          <p className="mt-3 text-sm font-medium">Comece pela peça</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Digite o nome do produto, o SKU ou use o leitor de código de barras
            para montar o carrinho.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <PackageX className="size-5" />
          </div>
          <p className="mt-3 text-sm font-medium">
            Nenhum produto para “{query.trim()}”
          </p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Confira a escrita ou tente parte do nome — por exemplo “vestido” no
            lugar do nome completo.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2" aria-label="Resultados da busca">
          {results.map((hit) => {
            const soldOut = hit.stock === 0;
            return (
              <li key={hit.product.id}>
                <button
                  type="button"
                  disabled={soldOut}
                  onClick={() => onSelect(hit)}
                  className={cn(
                    "flex w-full min-h-16 items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring/50",
                    soldOut
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:border-primary/40 hover:bg-accent/50 active:bg-accent"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {hit.product.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {hit.product.sku} · {hit.product.category}
                      {hit.colors.length > 0
                        ? ` · ${hit.colors.slice(0, 3).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatBRL(hit.price)}
                    </p>
                    {hit.product.promoPrice ? (
                      <p className="text-xs text-muted-foreground line-through tabular-nums">
                        {formatBRL(hit.product.price)}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      soldOut ? "critical" : hit.stock <= 3 ? "warning" : "secondary"
                    }
                    className="shrink-0"
                  >
                    {soldOut ? "Sem estoque" : `${hit.stock} em estoque`}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
