"use client";

import { Calculator } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatBRL, formatNumber } from "@/lib/format";
import { filterSales, resolvePeriod, salesByPayment, summarize } from "@/lib/metrics";

export default function CaixaPage() {
  const today = resolvePeriod("hoje").current;
  const sales = filterSales(today);
  const summary = summarize(sales);
  const pix = salesByPayment(sales).find((p) => p.name === "Pix")?.value ?? 0;

  return (
    <ModulePreview
      title="Caixa"
      description="Abertura, sangria, reforço e fechamento com conferência por forma de pagamento."
      stage={3}
      icon={Calculator}
      stats={[
        { label: "Vendas de hoje", value: formatNumber(summary.salesCount) },
        { label: "Entradas de hoje", value: formatBRL(summary.revenue) },
        { label: "Recebido em Pix hoje", value: formatBRL(pix) },
        { label: "Status do caixa", value: "Aberto" },
      ]}
      features={[
        "Abertura e fechamento de caixa por operador",
        "Conferência cega por forma de pagamento",
        "Sangria e reforço com motivo e responsável",
        "Diferenças de caixa registradas e auditáveis",
        "Movimentações vinculadas às vendas do dia",
        "Histórico de fechamentos por período",
      ]}
    />
  );
}
