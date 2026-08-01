"use client";

import { ChartColumn } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatBRL, formatPercent } from "@/lib/format";
import { filterSales, resolvePeriod, summarize, deltaPercent } from "@/lib/metrics";

export default function RelatoriosPage() {
  const period = resolvePeriod("30d");
  const current = summarize(filterSales(period.current));
  const previous = summarize(filterSales(period.previous));
  const growth = deltaPercent(current.revenue, previous.revenue);

  return (
    <ModulePreview
      title="Relatórios"
      description="Análises comparativas com exportação em PDF e Excel."
      stage={3}
      icon={ChartColumn}
      stats={[
        { label: "Faturamento (30 dias)", value: formatBRL(current.revenue) },
        {
          label: "Crescimento vs. anterior",
          value: growth !== null ? formatPercent(growth, 1) : "—",
        },
        { label: "Descontos concedidos", value: formatBRL(current.discountTotal) },
        { label: "Margem bruta", value: formatPercent(current.margin, 1) },
      ]}
      features={[
        "Relatórios de vendas, produtos, estoque e clientes",
        "Vendedores, comissões, devoluções e descontos",
        "Financeiro: despesas, lucro e meios de pagamento",
        "Comparação entre períodos lado a lado",
        "Exportação simulada em PDF e Excel",
        "Impressão e salvamento de filtros favoritos",
      ]}
    />
  );
}
