"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Phone, Plus, Shirt, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatBRL, formatNumber } from "@/lib/format";
import { stockAnalysis } from "@/lib/metrics";
import type { AppState } from "@/lib/store";
import type { Supplier } from "@/lib/types";

interface SupplierRow {
  supplier: Supplier;
  purchased: number;
  ordersCount: number;
  openOrders: number;
  openValue: number;
  activeProducts: number;
  needsRestock: number;
}

/** Aba de fornecedores: quem abastece cada categoria e quanto já foi comprado. */
export function SuppliersTab({ state }: { state: AppState }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const rows = useMemo<SupplierRow[]>(() => {
    const restockBySupplier = new Map<string, number>();
    for (const row of stockAnalysis(state)) {
      if (!row.needsRestock || row.product.status !== "ativo") continue;
      restockBySupplier.set(
        row.product.supplierId,
        (restockBySupplier.get(row.product.supplierId) ?? 0) + 1
      );
    }

    return state.suppliers
      .map((supplier) => {
        const purchases = state.purchases.filter(
          (p) => p.supplierId === supplier.id && p.status !== "cancelado"
        );
        const open = purchases.filter(
          (p) => p.status === "pedido" || p.status === "rascunho"
        );
        return {
          supplier,
          purchased: purchases.reduce((sum, p) => sum + p.total, 0),
          ordersCount: purchases.length,
          openOrders: open.length,
          openValue: open.reduce((sum, p) => sum + p.total, 0),
          activeProducts: state.products.filter(
            (p) => p.supplierId === supplier.id && p.status === "ativo"
          ).length,
          needsRestock: restockBySupplier.get(supplier.id) ?? 0,
        };
      })
      .sort((a, b) => b.purchased - a.purchased || b.activeProducts - a.activeProducts);
  }, [state]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.supplier.name.toLowerCase().includes(query) ||
        row.supplier.city.toLowerCase().includes(query) ||
        row.supplier.categories.some((c) => c.toLowerCase().includes(query))
    );
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome, cidade ou categoria…"
        aria-label="Buscar fornecedores"
        className="sm:max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum fornecedor encontrado"
          description="Revise a busca: o termo não bate com nome, cidade ou categoria de nenhum fornecedor."
          action={
            <Button size="sm" variant="outline" onClick={() => setSearch("")}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <Card key={row.supplier.id} className="flex flex-col gap-3 p-4">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">
                  {row.supplier.name}
                </h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {row.supplier.city}/{row.supplier.state}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {row.supplier.phone}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {row.supplier.categories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>

              <Separator />

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Total já comprado</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatBRL(row.purchased)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Pedidos em aberto</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatNumber(row.openOrders)}
                    {row.openOrders > 0 ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        · {formatBRL(row.openValue)}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Produtos ativos</dt>
                  <dd className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                    <Shirt className="size-3.5 text-muted-foreground" aria-hidden />
                    {formatNumber(row.activeProducts)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Pedidos feitos</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatNumber(row.ordersCount)}
                  </dd>
                </div>
              </dl>

              {row.needsRestock > 0 ? (
                <p className="rounded-lg bg-warning/12 px-2.5 py-1.5 text-xs text-foreground">
                  {formatNumber(row.needsRestock)}{" "}
                  {row.needsRestock === 1
                    ? "produto deste fornecedor precisa"
                    : "produtos deste fornecedor precisam"}{" "}
                  de reposição.
                </p>
              ) : null}

              <Button
                size="sm"
                variant={row.needsRestock > 0 ? "default" : "outline"}
                className="mt-auto w-full"
                onClick={() =>
                  router.push(`/compras/nova?fornecedor=${row.supplier.id}`)
                }
              >
                <Plus /> Novo pedido
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
