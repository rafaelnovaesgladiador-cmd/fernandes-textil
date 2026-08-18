"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Search, Shirt, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { useStore } from "@/hooks/use-store";
import { formatBRL } from "@/lib/format";
import { variantsByProduct } from "@/lib/metrics";

/** Busca global sobre produtos e clientes da loja. */
export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const state = useStore();
  const [query, setQuery] = useState("");

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const [productId, variants] of variantsByProduct(state)) {
      map.set(
        productId,
        variants.reduce((sum, v) => sum + v.stock, 0)
      );
    }
    return map;
  }, [state]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { products: [], customers: [] };
    return {
      products: state.products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.barcode.includes(q) ||
            p.category.toLowerCase().includes(q)
        )
        .slice(0, 6),
      customers: state.customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) || c.phone.includes(q)
        )
        .slice(0, 4),
    };
  }, [query, state]);

  const go = (href: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  };

  const hasQuery = query.trim().length >= 2;
  const hasResults = results.products.length > 0 || results.customers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 translate-y-0 gap-3 p-4">
        <DialogHeader className="sr-only">
          <DialogTitle>Busca</DialogTitle>
          <DialogDescription>Busque produtos e clientes da loja</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto, SKU, categoria ou cliente…"
            className="pl-9"
            aria-label="Buscar produto, SKU, categoria ou cliente"
          />
        </div>

        {!hasQuery ? (
          <p className="px-1 pb-1 text-xs text-muted-foreground">
            Digite ao menos 2 letras. Ex.: “vestido midi”, “BM-VES”, “Mariana”.
          </p>
        ) : !hasResults ? (
          <EmptyState
            icon={Search}
            title="Nada encontrado"
            description={`Nenhum produto ou cliente corresponde a “${query.trim()}”.`}
            className="border-0 p-6"
          />
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {results.products.length > 0 && (
              <div>
                <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
                  Produtos
                </p>
                {results.products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => go(`/produtos/${product.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary outline-none cursor-pointer"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <Shirt className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{product.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {product.category} · {product.sku}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-medium tabular-nums">
                        {formatBRL(product.promoPrice ?? product.price)}
                      </span>
                      <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Package className="size-3" />{" "}
                        {stockByProductId.get(product.id) ?? 0} un.
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {results.customers.length > 0 && (
              <div>
                <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
                  Clientes
                </p>
                {results.customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => go(`/clientes/${customer.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary outline-none cursor-pointer"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                      <Users className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{customer.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {customer.city} · {customer.whatsapp}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
