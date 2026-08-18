"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, ShoppingBag, TicketPercent, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommissionPanel } from "@/components/vendedores/commission-panel";
import { SellerGoalDialog } from "@/components/vendedores/goal-dialog";
import { SellerCard } from "@/components/vendedores/seller-card";
import { SellerHighlights } from "@/components/vendedores/seller-highlights";
import { SellerRevenueChart } from "@/components/vendedores/seller-revenue-chart";
import { SellerTable } from "@/components/vendedores/seller-table";
import { useStore } from "@/hooks/use-store";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import {
  filterSales,
  resolvePeriod,
  sellerPerformance,
  summarize,
  type SellerPerformance,
} from "@/lib/metrics";

type SellerPeriod = "mes" | "mes_anterior" | "30d";

const PERIOD_OPTIONS: Array<{ value: SellerPeriod; label: string }> = [
  { value: "mes", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "30d", label: "Últimos 30 dias" },
];

export default function VendedoresPage() {
  const state = useStore();
  const [period, setPeriod] = useState<SellerPeriod>("mes");
  const [goalTarget, setGoalTarget] = useState<SellerPerformance | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  // Mantém a vendedora selecionada enquanto o diálogo fecha (animação de saída).
  const editGoal = (entry: SellerPerformance) => {
    setGoalTarget(entry);
    setGoalOpen(true);
  };

  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "";

  const data = useMemo(() => {
    const { current } = resolvePeriod(period);
    const sales = filterSales(state, current);
    const performance = sellerPerformance(state, sales);
    return { performance, summary: summarize(sales) };
  }, [state, period]);

  const { performance, summary } = data;
  const showGoal = period === "mes" || period === "mes_anterior";
  const topRevenue = performance[0]?.revenue ?? 0;
  const totalCommission = performance.reduce(
    (sum, entry) => sum + entry.commission,
    0
  );
  const withSales = performance.filter((entry) => entry.salesCount > 0);
  const bestMargin =
    withSales.length > 0
      ? withSales.reduce((top, entry) => (entry.margin > top.margin ? entry : top))
      : null;
  const leader = performance[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendedoras"
        description="Desempenho, metas e comissões — com margem, atendimento e devolução no mesmo painel."
        actions={
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as SellerPeriod)}
          >
            <SelectTrigger aria-label="Escolher período" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {summary.salesCount === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhuma venda neste período"
          description="Escolha outro período para ver o desempenho da equipe."
        />
      ) : (
        <>
          <section
            aria-label="Resumo da equipe"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <StatCard
              label="Faturamento da equipe"
              value={formatBRL(summary.revenue)}
              icon={CircleDollarSign}
              hint={`${periodLabel} · vendas finalizadas e trocas.`}
            />
            <StatCard
              label="Vendas"
              value={formatNumber(summary.salesCount)}
              icon={ShoppingBag}
            />
            <StatCard
              label="Ticket médio da loja"
              value={formatBRL(summary.ticket)}
              icon={TicketPercent}
              hint="Referência para comparar o ticket de cada vendedora."
            />
            <StatCard
              label="Comissões previstas"
              value={formatBRL(totalCommission)}
              icon={Wallet}
              hint="Soma das comissões do período pela regra de cada vendedora."
            />
          </section>

          <SellerHighlights data={performance} />

          <Card className="flex items-start gap-3 p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Users className="size-4" />
            </div>
            <p className="text-sm">
              {leader ? (
                <>
                  <strong>{leader.seller.name}</strong> lidera o faturamento com{" "}
                  {formatBRL(leader.revenue)}
                  {bestMargin && bestMargin.seller.id !== leader.seller.id ? (
                    <>
                      , mas <strong>{bestMargin.seller.name}</strong> entrega a maior
                      margem ({formatPercent(bestMargin.margin, 1)} contra{" "}
                      {formatPercent(leader.margin, 1)}): vender mais nem sempre é
                      deixar mais lucro na loja.
                    </>
                  ) : (
                    <> e também sustenta a melhor margem do período.</>
                  )}
                </>
              ) : null}
            </p>
          </Card>

          <section aria-label="Ranking de vendedoras" className="space-y-3">
            <h2 className="text-sm font-semibold">Desempenho individual</h2>
            <div className="grid gap-3 xl:grid-cols-2">
              {performance.map((entry, index) => (
                <SellerCard
                  key={entry.seller.id}
                  entry={entry}
                  position={index + 1}
                  showGoal={showGoal}
                  topRevenue={topRevenue}
                  onEditGoal={editGoal}
                />
              ))}
            </div>
            {!showGoal ? (
              <p className="text-xs text-muted-foreground">
                Nos últimos 30 dias a barra compara cada vendedora com a líder do
                período — a meta é mensal e só faz sentido em mês fechado.
              </p>
            ) : null}
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <SellerRevenueChart data={performance} periodLabel={periodLabel} />
            <CommissionPanel data={performance} periodLabel={periodLabel} />
          </div>

          <SellerTable data={performance} />
        </>
      )}

      <SellerGoalDialog
        open={goalOpen}
        onOpenChange={setGoalOpen}
        entry={goalTarget}
      />
    </div>
  );
}
