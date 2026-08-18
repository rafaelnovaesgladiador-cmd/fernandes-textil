"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseOrdersTab } from "@/components/compras/purchase-orders-tab";
import { SuppliersTab } from "@/components/compras/suppliers-tab";
import { useStore } from "@/hooks/use-store";
import { formatBRL, formatNumber } from "@/lib/format";

/**
 * Compras: pedidos a fornecedores e a ficha de cada fornecedor.
 * O recebimento do pedido é o ponto que liga compras, estoque e financeiro.
 */
export default function ComprasPage() {
  const router = useRouter();
  const state = useStore();
  const [tab, setTab] = useState("pedidos");

  const open = state.purchases.filter(
    (p) => p.status === "pedido" || p.status === "rascunho"
  );
  const openValue = open.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras"
        description={
          open.length > 0
            ? `${formatNumber(open.length)} ${
                open.length === 1 ? "pedido em aberto" : "pedidos em aberto"
              } · ${formatBRL(openValue)} a receber dos fornecedores`
            : `${formatNumber(state.suppliers.length)} fornecedores cadastrados · nenhum pedido aguardando recebimento`
        }
        actions={
          <Button onClick={() => router.push("/compras/nova")}>
            <Plus /> Novo pedido
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <PurchaseOrdersTab state={state} />
        </TabsContent>

        <TabsContent value="fornecedores">
          <SuppliersTab state={state} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
