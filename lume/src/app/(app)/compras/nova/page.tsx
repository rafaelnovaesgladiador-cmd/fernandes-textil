"use client";

import { Suspense } from "react";
import { PurchaseForm } from "@/components/compras/purchase-form";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Novo pedido de compra. O formulário lê `?fornecedor=` para chegar
 * pré-selecionado a partir da ficha do fornecedor.
 */
export default function NovaCompraPage() {
  return (
    <Suspense fallback={<NovaCompraSkeleton />}>
      <PurchaseForm />
    </Suspense>
  );
}

function NovaCompraSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando pedido">
      <Skeleton className="h-14" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
