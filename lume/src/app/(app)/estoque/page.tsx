"use client";

import { Package } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatBRL, formatNumber } from "@/lib/format";
import { stockSummary } from "@/lib/metrics";

export default function EstoquePage() {
  const stock = stockSummary();

  return (
    <ModulePreview
      title="Estoque"
      description="Saldo por variação, movimentações auditadas e análises de giro."
      stage={2}
      icon={Package}
      stats={[
        { label: "Peças em estoque", value: formatNumber(stock.totalPieces) },
        { label: "Custo do estoque", value: formatBRL(stock.stockCost) },
        {
          label: "Produtos parados (+90d)",
          value: `${formatNumber(stock.stalled.count)} · ${formatBRL(stock.stalled.value)}`,
        },
        { label: "Alto giro p/ repor", value: formatNumber(stock.lowStockProducts) },
      ]}
      features={[
        "Entrada, saída, ajuste, perda, avaria, devolução e troca",
        "Transferência entre unidades e inventário",
        "Histórico completo: usuário, data/hora e motivo",
        "Curva ABC e giro por produto, tamanho e cor",
        "Produtos sem venda há 30/60/90/120 dias",
        "Sugestão de reposição por cobertura de estoque",
        "Sugestão de liquidação para capital parado",
        "Alertas de estoque mínimo por variação",
      ]}
    />
  );
}
