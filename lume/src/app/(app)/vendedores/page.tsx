"use client";

import { UsersRound } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { SellersCard } from "@/components/dashboard/sellers-card";
import { formatBRL } from "@/lib/format";
import { filterSales, resolvePeriod, sellerPerformance } from "@/lib/metrics";

export default function VendedoresPage() {
  const julySales = filterSales(resolvePeriod("mes_anterior").current);
  const performance = sellerPerformance(julySales);
  const best = performance[0];
  const totalCommission = performance.reduce((sum, s) => sum + s.commission, 0);

  return (
    <ModulePreview
      title="Vendedores"
      description="Ranking multi-critério e comissões — não só quem fatura mais."
      stage={2}
      icon={UsersRound}
      stats={[
        { label: "Vendedoras ativas", value: String(performance.length) },
        { label: "Melhor do mês (julho)", value: best.seller.name.split(" ")[0] },
        { label: "Faturamento dela", value: formatBRL(best.revenue) },
        { label: "Comissões de julho", value: formatBRL(totalCommission) },
      ]}
      features={[
        "Faturamento, peças, ticket médio e desconto médio por vendedora",
        "Lucro gerado e margem média — não só volume",
        "Maior ticket, menor devolução e clientes reativados",
        "Metas individuais com percentual atingido",
        "Regras de comissão: fixa, por categoria, por faixa de meta",
        "Comissão sobre venda, sobre recebido ou sobre lucro",
        "Comissão prevista vs. paga por período",
        "Ranking equilibrado com vários critérios",
      ]}
    >
      <SellersCard data={performance} showGoal />
    </ModulePreview>
  );
}
