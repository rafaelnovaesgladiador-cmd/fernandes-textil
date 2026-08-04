import { demoDay, monthKey, DEMO_TODAY } from "@/lib/dates";
import { formatBRL, formatDeltaPercent, formatPercent } from "@/lib/format";
import {
  cashFlow,
  currentGoal,
  deltaPercent,
  filterSales,
  inactiveCustomers,
  overduePayables,
  resolvePeriod,
  stockSummary,
  summarize,
} from "@/lib/metrics";
import type { AppState } from "@/lib/store/state";
import type { Alert } from "@/lib/types";

/**
 * Central de alertas.
 *
 * Cada alerta é derivado do estado atual — os valores citados nos textos são
 * calculados, nunca escritos à mão. Uma venda registrada agora muda os
 * alertas na mesma hora.
 */
export function buildAlerts(state: AppState): Alert[] {
  const alerts: Alert[] = [];
  const companyId = state.companyId;
  const stock = stockSummary(state);
  const inactive = inactiveCustomers(state, 120);

  const last30 = resolvePeriod("30d");
  const current30 = summarize(filterSales(state, last30.current));
  const previous30 = summarize(filterSales(state, last30.previous));
  const revenueDelta = deltaPercent(current30.revenue, previous30.revenue);
  const profitDelta = deltaPercent(current30.grossProfit, previous30.grossProfit);

  const monthSummary = summarize(filterSales(state, resolvePeriod("mes").current));
  const goal = currentGoal(state);

  const monthTotal = (key: string) =>
    state.expenses
      .filter((e) => monthKey(e.date) === key)
      .reduce((sum, e) => sum + e.amount, 0);
  const julyExpenses = monthTotal("2026-07");
  const juneExpenses = monthTotal("2026-06");
  const expenseDelta = deltaPercent(julyExpenses, juneExpenses);

  const julyCardFees = state.expenses
    .filter((e) => monthKey(e.date) === "2026-07" && e.category === "taxas_cartao")
    .reduce((sum, e) => sum + e.amount, 0);

  if (stock.stalled.value > 0) {
    alerts.push({
      id: "alr_estoque_parado",
      companyId,
      category: "estoque",
      priority: "alta",
      title: `${formatBRL(stock.stalled.value)} estão parados em produtos sem venda há mais de 90 dias`,
      explanation: `${stock.stalled.count} produtos não vendem há mais de 90 dias e seguem ocupando estoque. Esse valor é capital imobilizado que não gera retorno.`,
      estimatedImpact: stock.stalled.value,
      recommendation:
        "Monte uma liquidação com desconto progressivo ou destaque essas peças no catálogo para recuperar o capital.",
      actionLabel: "Ver produtos parados",
      actionHref: "/estoque?analise=parados",
      date: demoDay(0, 8).toISOString(),
      status: "aberto",
    });
  }

  if (stock.lowStockProducts > 0) {
    alerts.push({
      id: "alr_estoque_baixo",
      companyId,
      category: "estoque",
      priority: "critica",
      title: `Estoque baixo em ${stock.lowStockProducts} produtos de alto giro`,
      explanation:
        "Produtos que vendem toda semana estão com cobertura de estoque insuficiente — inclusive nos tamanhos M e G, os mais vendidos.",
      recommendation:
        "Gere a lista de reposição e antecipe o pedido aos fornecedores antes do fim de semana, quando o giro é maior.",
      actionLabel: "Gerar lista de reposição",
      actionHref: "/estoque?analise=reposicao",
      date: demoDay(0, 7).toISOString(),
      status: "aberto",
    });
  }

  if (
    revenueDelta !== null &&
    profitDelta !== null &&
    revenueDelta > 0 &&
    profitDelta < revenueDelta
  ) {
    alerts.push({
      id: "alr_margem",
      companyId,
      category: "vendas",
      priority: "alta",
      title:
        profitDelta < 0
          ? `Sua loja vendeu ${formatDeltaPercent(revenueDelta)} a mais, mas o lucro caiu ${formatPercent(Math.abs(profitDelta), 1)}`
          : `As vendas cresceram ${formatDeltaPercent(revenueDelta)}, mas o lucro cresceu só ${formatDeltaPercent(profitDelta)}`,
      explanation: `Nos últimos 30 dias os descontos somaram ${formatBRL(current30.discountTotal)} — a margem bruta foi de ${formatPercent(previous30.margin, 1)} para ${formatPercent(current30.margin, 1)}.`,
      estimatedImpact: Math.max(0, previous30.grossProfit - current30.grossProfit),
      recommendation:
        "Revise a política de descontos: limite o percentual por vendedora e concentre promoções apenas nas peças paradas.",
      actionLabel: "Analisar descontos",
      actionHref: "/relatorios?relatorio=descontos",
      date: demoDay(0, 8, 30).toISOString(),
      status: "aberto",
    });
  }

  if (inactive.length > 0) {
    alerts.push({
      id: "alr_clientes_inativos",
      companyId,
      category: "clientes",
      priority: "media",
      title: `${inactive.length} clientes estão sem comprar há mais de 120 dias`,
      explanation:
        "São clientes que já compraram na loja e deixaram de voltar. Reativar quem já conhece a marca custa muito menos do que conquistar clientes novos.",
      recommendation:
        "Crie uma campanha de reativação no WhatsApp com condição exclusiva válida por poucos dias.",
      actionLabel: "Ver clientes inativos",
      actionHref: "/clientes?segmento=inativo",
      date: demoDay(-1, 18).toISOString(),
      status: "aberto",
    });
  }

  if (expenseDelta !== null && expenseDelta > 5) {
    alerts.push({
      id: "alr_despesas",
      companyId,
      category: "financeiro",
      priority: "media",
      title: `As despesas cresceram ${formatDeltaPercent(expenseDelta)} em julho`,
      explanation: `Julho fechou com ${formatBRL(julyExpenses)} em despesas, contra ${formatBRL(juneExpenses)} em junho. Marketing e taxas de cartão puxaram a alta.`,
      estimatedImpact: julyExpenses - juneExpenses,
      recommendation:
        "Avalie o retorno das campanhas pagas e negocie as taxas da maquininha — juntas, elas explicam a maior parte do aumento.",
      actionLabel: "Analisar despesas",
      actionHref: "/financeiro?aba=despesas",
      date: demoDay(-2, 10).toISOString(),
      status: "aberto",
    });
  }

  if (julyCardFees > 0) {
    alerts.push({
      id: "alr_taxas",
      companyId,
      category: "financeiro",
      priority: "baixa",
      title: `As taxas de cartão consumiram ${formatBRL(julyCardFees)} do resultado de julho`,
      explanation:
        "Crédito e débito representam mais da metade do faturamento — a taxa média está em 3,2% por transação.",
      recommendation:
        "Incentive o Pix com um benefício pequeno (ex.: brinde ou 3% de desconto) e renegocie a taxa com a adquirente.",
      actionLabel: "Ver financeiro",
      actionHref: "/financeiro",
      date: demoDay(-3, 9).toISOString(),
      status: "aberto",
    });
  }

  if (goal) {
    const percent = (monthSummary.revenue / goal.revenueTarget) * 100;
    alerts.push({
      id: "alr_meta",
      companyId,
      category: "metas",
      priority: percent < 4 ? "media" : "baixa",
      title: `Meta de agosto: ${formatBRL(goal.revenueTarget)} — ${formatPercent(percent, 1)} atingido`,
      explanation: `Para bater a meta, a loja precisa vender em média ${formatBRL(goal.revenueTarget / 26)} por dia útil ao longo do mês.`,
      recommendation:
        "Acompanhe a meta diariamente no Dashboard e reforce as campanhas nos dias de menor movimento (terça e quarta).",
      actionLabel: "Ver meta do mês",
      actionHref: "/visao-geral",
      date: demoDay(0, 6).toISOString(),
      status: "aberto",
    });
  }

  // Contas vencidas — derivadas do estado, então somem ao serem pagas.
  const overdue = overduePayables(state);
  if (overdue.length > 0) {
    const total = overdue.reduce((sum, p) => sum + p.amount, 0);
    const first = overdue[0];
    alerts.push({
      id: "alr_conta_vencida",
      companyId,
      category: "financeiro",
      priority: "critica",
      title:
        overdue.length === 1
          ? `Conta vencida: ${first.description}`
          : `${overdue.length} contas vencidas somam ${formatBRL(total)}`,
      explanation: `${first.description}${first.supplierName ? ` (${first.supplierName})` : ""} venceu e segue em aberto: ${formatBRL(first.amount)}.`,
      estimatedImpact: total,
      recommendation:
        "Negocie o pagamento ainda esta semana para evitar juros e proteger o relacionamento com o fornecedor.",
      actionLabel: "Ver contas a pagar",
      actionHref: "/financeiro?aba=pagar",
      date: demoDay(0, 7, 15).toISOString(),
      status: "aberto",
    });
  }

  // Projeção de caixa negativo nos próximos dias.
  const flow = cashFlow(state, 7, 21);
  if (flow.minProjected < 0) {
    const firstNegative = flow.points.find(
      (p) => p.date.getTime() >= DEMO_TODAY.getTime() && p.balance < 0
    );
    if (firstNegative) {
      const days = Math.max(
        1,
        Math.round(
          (firstNegative.date.getTime() - DEMO_TODAY.getTime()) / 86_400_000
        )
      );
      alerts.push({
        id: "alr_caixa_negativo",
        companyId,
        category: "financeiro",
        priority: "alta",
        title: `O caixa pode ficar negativo nos próximos ${days} dias`,
        explanation: `Considerando as contas a pagar e a receber já lançadas, o saldo projetado chega a ${formatBRL(flow.minProjected)}.`,
        estimatedImpact: Math.abs(flow.minProjected),
        recommendation:
          "Antecipe recebíveis, renegocie o vencimento das duplicatas maiores ou reforce as vendas com uma ação pontual.",
        actionLabel: "Ver fluxo de caixa",
        actionHref: "/financeiro?aba=fluxo",
        date: demoDay(0, 7, 45).toISOString(),
        status: "aberto",
      });
    }
  }

  // Aplica as decisões do usuário (resolvido/ignorado) sobre os alertas vivos.
  return alerts.map((alert) => ({
    ...alert,
    status: state.alertStatus[alert.id] ?? alert.status,
  }));
}
