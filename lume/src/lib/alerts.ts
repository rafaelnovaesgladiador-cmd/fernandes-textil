import { demoDay, monthKey } from "@/lib/dates";
import { formatBRL, formatDeltaPercent, formatPercent } from "@/lib/format";
import {
  deltaPercent,
  filterSales,
  inactiveCustomers,
  resolvePeriod,
  stockSummary,
  summarize,
  currentGoal,
} from "@/lib/metrics";
import { COMPANY_ID, demoExpenses } from "@/lib/mock";
import type { Alert } from "@/lib/types";

/**
 * Central de alertas: cada alerta é DERIVADO da mesma massa de dados que
 * alimenta o Dashboard — os valores citados nos textos são calculados,
 * nunca escritos à mão.
 */
export function buildAlerts(): Alert[] {
  const alerts: Alert[] = [];
  const stock = stockSummary();
  const inactive = inactiveCustomers(120);

  const last30 = resolvePeriod("30d");
  const current30 = summarize(filterSales(last30.current));
  const previous30 = summarize(filterSales(last30.previous));
  const revenueDelta = deltaPercent(current30.revenue, previous30.revenue);
  const profitDelta = deltaPercent(current30.grossProfit, previous30.grossProfit);

  const monthRange = resolvePeriod("mes");
  const monthSummary = summarize(filterSales(monthRange.current));
  const goal = currentGoal();

  // Despesas: julho vs junho (últimos meses fechados).
  const julyExpenses = demoExpenses
    .filter((e) => monthKey(e.date) === "2026-07")
    .reduce((sum, e) => sum + e.amount, 0);
  const juneExpenses = demoExpenses
    .filter((e) => monthKey(e.date) === "2026-06")
    .reduce((sum, e) => sum + e.amount, 0);
  const expenseDelta = deltaPercent(julyExpenses, juneExpenses);

  const julyCardFees = demoExpenses
    .filter((e) => monthKey(e.date) === "2026-07" && e.category === "taxas_cartao")
    .reduce((sum, e) => sum + e.amount, 0);

  if (stock.stalled.value > 0) {
    alerts.push({
      id: "alr_estoque_parado",
      companyId: COMPANY_ID,
      category: "estoque",
      priority: "alta",
      title: `${formatBRL(stock.stalled.value)} estão parados em produtos sem venda há mais de 90 dias`,
      explanation: `${stock.stalled.count} produtos não vendem há mais de 90 dias e seguem ocupando estoque. Esse valor é capital imobilizado que não gera retorno.`,
      estimatedImpact: stock.stalled.value,
      recommendation:
        "Monte uma liquidação com desconto progressivo ou destaque essas peças no catálogo para recuperar o capital.",
      actionLabel: "Ver produtos parados",
      actionHref: "/estoque",
      date: demoDay(0, 8).toISOString(),
      status: "aberto",
    });
  }

  if (stock.lowStockProducts > 0) {
    alerts.push({
      id: "alr_estoque_baixo",
      companyId: COMPANY_ID,
      category: "estoque",
      priority: "critica",
      title: `Estoque baixo em ${stock.lowStockProducts} produtos de alto giro`,
      explanation:
        "Produtos que vendem toda semana estão com cobertura de estoque insuficiente — inclusive nos tamanhos M e G, os mais vendidos.",
      recommendation:
        "Gere a lista de reposição e antecipe o pedido aos fornecedores antes do fim de semana, quando o giro é maior.",
      actionLabel: "Gerar lista de reposição",
      actionHref: "/estoque",
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
      companyId: COMPANY_ID,
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
      actionHref: "/relatorios",
      date: demoDay(0, 8, 30).toISOString(),
      status: "aberto",
    });
  }

  if (inactive.length > 0) {
    alerts.push({
      id: "alr_clientes_inativos",
      companyId: COMPANY_ID,
      category: "clientes",
      priority: "media",
      title: `${inactive.length} clientes estão sem comprar há mais de 120 dias`,
      explanation:
        "São clientes que já compraram na loja e deixaram de voltar. Reativar quem já conhece a marca custa muito menos do que conquistar clientes novos.",
      recommendation:
        "Crie uma campanha de reativação no WhatsApp com condição exclusiva válida por poucos dias.",
      actionLabel: "Ver clientes",
      actionHref: "/clientes",
      date: demoDay(-1, 18).toISOString(),
      status: "aberto",
    });
  }

  if (expenseDelta !== null && expenseDelta > 5) {
    alerts.push({
      id: "alr_despesas",
      companyId: COMPANY_ID,
      category: "financeiro",
      priority: "media",
      title: `As despesas cresceram ${formatDeltaPercent(expenseDelta)} em julho`,
      explanation: `Julho fechou com ${formatBRL(julyExpenses)} em despesas, contra ${formatBRL(juneExpenses)} em junho. Marketing e taxas de cartão puxaram a alta.`,
      estimatedImpact: julyExpenses - juneExpenses,
      recommendation:
        "Avalie o retorno das campanhas pagas e negocie as taxas da maquininha — juntas, elas explicam a maior parte do aumento.",
      actionLabel: "Analisar despesas",
      actionHref: "/financeiro",
      date: demoDay(-2, 10).toISOString(),
      status: "aberto",
    });
  }

  if (julyCardFees > 0) {
    alerts.push({
      id: "alr_taxas",
      companyId: COMPANY_ID,
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
    const monthProgress = (monthSummary.revenue / goal.revenueTarget) * 100;
    // 1º dia do mês: projeção simples pela média diária necessária.
    alerts.push({
      id: "alr_meta",
      companyId: COMPANY_ID,
      category: "metas",
      priority: monthProgress < 4 ? "media" : "baixa",
      title: `Meta de agosto: ${formatBRL(goal.revenueTarget)} — ${formatPercent(monthProgress, 1)} atingido`,
      explanation: `Para bater a meta, a loja precisa vender em média ${formatBRL(goal.revenueTarget / 26)} por dia útil ao longo do mês.`,
      recommendation:
        "Acompanhe a meta diariamente no Dashboard e reforce as campanhas nos dias de menor movimento (terça e quarta).",
      actionLabel: "Ver meta do mês",
      actionHref: "/visao-geral",
      date: demoDay(0, 6).toISOString(),
      status: "aberto",
    });
  }

  alerts.push({
    id: "alr_conta_vencida",
    companyId: COMPANY_ID,
    category: "financeiro",
    priority: "critica",
    title: "Duplicata de fornecedor vencida há 4 dias",
    explanation:
      "A duplicata do pedido de vestidos (NF 7730, Estilo Brás Confecções) venceu em 28/07 e segue em aberto: R$ 1.890,00.",
    estimatedImpact: 1890,
    recommendation:
      "Negocie o pagamento ainda esta semana para evitar juros e proteger o relacionamento com o fornecedor da sua principal categoria.",
    actionLabel: "Ver contas a pagar",
    actionHref: "/financeiro",
    date: demoDay(0, 7, 15).toISOString(),
    status: "aberto",
  });

  return alerts;
}

export const demoAlerts: Alert[] = buildAlerts();
