"use client";

import { Wallet } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatBRL } from "@/lib/format";
import {
  expensesInRange,
  filterSales,
  openPayables,
  openReceivables,
  resolvePeriod,
  summarize,
} from "@/lib/metrics";

export default function FinanceiroPage() {
  const julyRange = resolvePeriod("mes_anterior").current;
  const july = summarize(filterSales(julyRange));
  const julyExpenses = expensesInRange(julyRange);

  return (
    <ModulePreview
      title="Financeiro"
      description="Receitas, despesas, contas, fluxo de caixa e DRE simplificada."
      stage={3}
      icon={Wallet}
      stats={[
        { label: "Lucro bruto (julho)", value: formatBRL(july.grossProfit) },
        { label: "Despesas (julho)", value: formatBRL(julyExpenses) },
        { label: "Contas a receber", value: formatBRL(openReceivables()) },
        { label: "Contas a pagar", value: formatBRL(openPayables()) },
      ]}
      features={[
        "Contas a pagar e a receber com vencimentos e status",
        "Fluxo de caixa com previsão dos próximos dias",
        "Fechamento de caixa por dia e por operador",
        "Categorias financeiras e centros de custo",
        "DRE simplificada: do faturamento ao lucro líquido",
        "Separação clara entre faturamento, recebido, lucro e caixa",
        "Retiradas do proprietário e transferências",
        "Alertas de caixa negativo e despesas fora do padrão",
      ]}
    />
  );
}
