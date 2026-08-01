"use client";

import { Truck } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatBRL, formatNumber } from "@/lib/format";
import { demoPayables, demoSuppliers } from "@/lib/mock";

export default function ComprasPage() {
  const supplierPayables = demoPayables.filter((p) => p.supplierName);
  const openTotal = supplierPayables
    .filter((p) => p.status !== "pago")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <ModulePreview
      title="Compras"
      description="Pedidos a fornecedores com entrada automática no estoque."
      stage={3}
      icon={Truck}
      stats={[
        { label: "Fornecedores", value: formatNumber(demoSuppliers.length) },
        { label: "Duplicatas em aberto", value: formatNumber(supplierPayables.length) },
        { label: "Valor em aberto", value: formatBRL(openTotal) },
        { label: "Principal fornecedor", value: demoSuppliers[0].name.split(" ")[0] },
      ]}
      features={[
        "Cadastro de fornecedores por categoria",
        "Pedido de compra com itens, variações e custos",
        "Recebimento com conferência e entrada no estoque",
        "Duplicatas geradas direto no contas a pagar",
        "Histórico de custo por produto e fornecedor",
        "Sugestão de compra a partir do giro do estoque",
      ]}
    />
  );
}
