"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  Package,
  Receipt,
  Shirt,
  ShoppingBag,
  TicketPercent,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useComingSoon } from "@/components/coming-soon";
import { AttentionSection } from "@/components/dashboard/attention-section";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { DashboardFiltersBar } from "@/components/dashboard/dashboard-filters";
import { DonutCard } from "@/components/dashboard/donut-card";
import { GoalCard } from "@/components/dashboard/goal-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { SellersCard } from "@/components/dashboard/sellers-card";
import { TopProductsCard } from "@/components/dashboard/top-products-card";
import { formatBRL, formatDateLong, formatNumber } from "@/lib/format";
import { DEMO_TODAY } from "@/lib/dates";
import {
  dailySeries,
  deltaPercent,
  executiveSummary,
  filterSales,
  resolvePeriod,
  salesByCategory,
  salesByChannel,
  salesByPayment,
  sellerPerformance,
  summarize,
  topProducts,
  type DashboardFilters,
} from "@/lib/metrics";
import { demoCompany, demoUser } from "@/lib/mock";

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    period: "30d",
    channel: "todos",
    sellerId: "todos",
  });
  const [loading, setLoading] = useState(false);
  const comingSoon = useComingSoon();

  // Estado de carregamento simulado ao trocar filtros (UX de dados reais).
  const applyFilters = (next: DashboardFilters) => {
    setLoading(true);
    setFilters(next);
  };

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [loading]);

  const data = useMemo(() => {
    const { current, previous, compareLabel } = resolvePeriod(filters.period);
    const scope = { channel: filters.channel, sellerId: filters.sellerId };
    const sales = filterSales(current, scope);
    const previousSales = filterSales(previous, scope);
    const summary = summarize(sales);
    const previousSummary = summarize(previousSales);
    return {
      compareLabel,
      summary,
      previousSummary,
      series: dailySeries(current, sales),
      byCategory: salesByCategory(sales),
      byChannel: salesByChannel(sales),
      byPayment: salesByPayment(sales),
      top: topProducts(sales),
      sellers: sellerPerformance(sales),
      executive: executiveSummary(),
    };
  }, [filters]);

  const { summary, previousSummary, compareLabel, executive } = data;
  const delta = (current: number, previous: number) =>
    deltaPercent(current, previous);

  const isFiltered = filters.channel !== "todos" || filters.sellerId !== "todos";
  const showDaily = filters.period !== "hoje" && filters.period !== "ontem";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${demoUser.name.split(" ")[0]}`}
        description={`${demoCompany.tradeName} · ${formatDateLong(DEMO_TODAY)} · Hoje: ${formatBRL(
          executive.today.revenue
        )} em ${executive.today.salesCount} vendas`}
        actions={
          <DashboardFiltersBar filters={filters} onChange={applyFilters} />
        }
      />

      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => comingSoon.show("Nova venda", 2)}>
          <ShoppingBag /> Nova venda
        </Button>
        <Button size="sm" variant="secondary" onClick={() => comingSoon.show("Novo produto", 2)}>
          <Shirt /> Novo produto
        </Button>
        <Button size="sm" variant="secondary" onClick={() => comingSoon.show("Nova despesa", 3)}>
          <Receipt /> Nova despesa
        </Button>
        <Button size="sm" variant="secondary" onClick={() => comingSoon.show("Novo cliente", 2)}>
          <Users /> Novo cliente
        </Button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : summary.salesCount === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhuma venda neste recorte"
          description="Não há vendas para o período e filtros escolhidos. Ajuste o período ou limpe os filtros."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                applyFilters({ period: "30d", channel: "todos", sellerId: "todos" })
              }
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <>
          {/* KPIs do período */}
          <section aria-label="Indicadores do período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Faturamento"
              value={formatBRL(summary.revenue)}
              delta={delta(summary.revenue, previousSummary.revenue)}
              deltaLabel={compareLabel}
              icon={CircleDollarSign}
              hint="Total das vendas finalizadas no período, já com descontos."
            />
            <StatCard
              label="Lucro bruto"
              value={formatBRL(summary.grossProfit)}
              delta={delta(summary.grossProfit, previousSummary.grossProfit)}
              deltaLabel={compareLabel}
              icon={TrendingUp}
              hint="Faturamento menos o custo das peças vendidas (CMV)."
            />
            <StatCard
              label="Vendas"
              value={formatNumber(summary.salesCount)}
              delta={delta(summary.salesCount, previousSummary.salesCount)}
              deltaLabel={compareLabel}
              icon={ShoppingBag}
            />
            <StatCard
              label="Ticket médio"
              value={formatBRL(summary.ticket)}
              delta={delta(summary.ticket, previousSummary.ticket)}
              deltaLabel={compareLabel}
              icon={TicketPercent}
            />
            <StatCard
              label="Peças vendidas"
              value={formatNumber(summary.pieces)}
              delta={delta(summary.pieces, previousSummary.pieces)}
              deltaLabel={compareLabel}
              icon={Shirt}
            />
            <StatCard
              label="Descontos concedidos"
              value={formatBRL(summary.discountTotal)}
              delta={delta(summary.discountTotal, previousSummary.discountTotal)}
              deltaLabel={compareLabel}
              icon={TicketPercent}
              invertDelta
              hint="Descontos reduzem a margem: acompanhe se estão trazendo volume."
            />
            <StatCard
              label="Contas a receber"
              value={formatBRL(executive.receivables)}
              icon={HandCoins}
              hint="Parcelas de crediário em aberto ou vencidas."
            />
            <StatCard
              label="Contas a pagar"
              value={formatBRL(executive.payables)}
              icon={CalendarClock}
              hint="Fornecedores e despesas com vencimento próximo."
            />
          </section>

          {/* Estoque (independente do período) */}
          <section aria-label="Indicadores de estoque" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Peças em estoque"
              value={formatNumber(executive.stock.totalPieces)}
              icon={Package}
            />
            <StatCard
              label="Custo do estoque"
              value={formatBRL(executive.stock.stockCost)}
              icon={Wallet}
              hint="Quanto dinheiro está investido nas peças paradas na loja."
            />
            <StatCard
              label="Potencial de venda"
              value={formatBRL(executive.stock.stockPotential)}
              icon={CircleDollarSign}
              hint="Valor do estoque a preço de etiqueta (com promoções aplicadas)."
            />
            <StatCard
              label="Parado há +90 dias"
              value={formatBRL(executive.stock.stalled.value)}
              icon={CalendarClock}
              hint={`${executive.stock.stalled.count} produtos sem venda há mais de 90 dias.`}
            />
          </section>

          <AttentionSection />

          {/* Gráficos */}
          <section aria-label="Gráficos" className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {showDaily ? (
                <RevenueChart data={data.series} />
              ) : (
                <DonutCard
                  title="Vendas por categoria"
                  description="Distribuição do faturamento do dia"
                  data={data.byCategory.slice(0, 5)}
                />
              )}
            </div>
            {executive.goal ? (
              <GoalCard
                goalTarget={executive.goal.target}
                monthRevenue={executive.month.revenue}
                netProfit={executive.netProfit}
                monthExpenses={executive.monthExpenses}
                grossMargin={executive.month.margin}
              />
            ) : null}
          </section>

          <section aria-label="Composição das vendas" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {showDaily ? <CategoryChart data={data.byCategory} /> : null}
            <DonutCard
              title="Vendas por canal"
              description="Loja física, WhatsApp e Instagram"
              data={data.byChannel}
            />
            <DonutCard
              title="Formas de pagamento"
              description="Composição do faturamento"
              data={data.byPayment}
            />
          </section>

          <section aria-label="Produtos e vendedoras" className="grid gap-4 lg:grid-cols-2">
            <TopProductsCard data={data.top} />
            <SellersCard
              data={data.sellers}
              showGoal={filters.period === "mes" || filters.period === "mes_anterior"}
            />
          </section>

          {isFiltered ? (
            <p className="text-xs text-muted-foreground">
              Indicadores de estoque, contas e meta são da loja inteira — não mudam
              com os filtros de canal e vendedora.
            </p>
          ) : null}
        </>
      )}

      {comingSoon.dialog}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando indicadores">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-27" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
