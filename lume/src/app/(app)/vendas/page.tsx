"use client";

import { ShoppingBag } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatBRL, formatNumber } from "@/lib/format";
import { filterSales, resolvePeriod, summarize } from "@/lib/metrics";

export default function VendasPage() {
  const month = summarize(filterSales(resolvePeriod("mes_anterior").current));

  return (
    <ModulePreview
      title="Vendas"
      description="Histórico completo, busca, filtros e o fluxo de nova venda."
      stage={2}
      icon={ShoppingBag}
      stats={[
        { label: "Vendas em julho", value: formatNumber(month.salesCount) },
        { label: "Faturamento de julho", value: formatBRL(month.revenue) },
        { label: "Ticket médio", value: formatBRL(month.ticket) },
        { label: "Peças vendidas", value: formatNumber(month.pieces) },
      ]}
      features={[
        "Nova venda com leitura de código de barras, cor, tamanho e quantidade",
        "Cliente, vendedora, canal e observações na venda",
        "Desconto por item ou no total, com limite por perfil",
        "Pagamento misto, parcelamento, crediário e troco",
        "Baixa automática de estoque e registro no financeiro",
        "Comissão calculada na finalização",
        "Status: em andamento, finalizada, cancelada, trocada e devolvida",
        "Comprovante com envio simulado por WhatsApp",
      ]}
    />
  );
}
