/**
 * Confere a coerência da base de demonstração e dos indicadores derivados.
 * Uso: npx tsx scripts/sanity.ts
 */
import { createSeedState } from "../src/lib/store/state";
import {
  cashFlow,
  customerStats,
  deltaPercent,
  executiveSummary,
  filterSales,
  incomeStatement,
  inactiveCustomers,
  resolvePeriod,
  salesByChannel,
  sellerPerformance,
  stockAnalysis,
  stockSummary,
  summarize,
  topProducts,
} from "../src/lib/metrics";
import { buildAlerts } from "../src/lib/alerts";

const state = createSeedState();
const brl = (v: number) => `R$ ${v.toFixed(2)}`;

console.log("=== BASE ===");
console.log(
  `produtos ${state.products.length} · variações ${state.variants.length} · clientes ${state.customers.length} · vendas ${state.sales.length} · despesas ${state.expenses.length}`
);

const exec = executiveSummary(state);
console.log("\n=== VISÃO EXECUTIVA ===");
console.log(`hoje: ${brl(exec.today.revenue)} em ${exec.today.salesCount} vendas`);
console.log(
  `mês: fat ${brl(exec.month.revenue)} · lucro bruto ${brl(exec.month.grossProfit)} · despesas ${brl(exec.monthExpenses)} · líquido ${brl(exec.netProfit)}`
);
console.log(
  `meta: ${exec.goal ? `${brl(exec.goal.target)} (${exec.goal.percent.toFixed(1)}%)` : "—"}`
);
console.log(`a receber ${brl(exec.receivables)} · a pagar ${brl(exec.payables)}`);

console.log("\n=== ESTOQUE ===");
const stock = stockSummary(state);
console.log(
  `peças ${stock.totalPieces} · custo ${brl(stock.stockCost)} · potencial ${brl(stock.stockPotential)} · margem ${stock.potentialMargin.toFixed(1)}%`
);
console.log(
  `repor ${stock.lowStockProducts} · sem estoque ${stock.outOfStockProducts} · parados ${stock.stalled.count} (${brl(stock.stalled.value)})`
);
const abc = stockAnalysis(state);
for (const cls of ["A", "B", "C"] as const) {
  const rows = abc.filter((r) => r.abcClass === cls);
  const revenue = rows.reduce((sum, r) => sum + r.revenue90, 0);
  console.log(`  curva ${cls}: ${rows.length} produtos · ${brl(revenue)} em 90 dias`);
}

console.log("\n=== COMPARAÇÃO 30 DIAS ===");
const p30 = resolvePeriod("30d");
const cur = summarize(filterSales(state, p30.current));
const prev = summarize(filterSales(state, p30.previous));
console.log(
  `fat ${brl(cur.revenue)} vs ${brl(prev.revenue)} → ${deltaPercent(cur.revenue, prev.revenue)?.toFixed(1)}%`
);
console.log(
  `lucro ${brl(cur.grossProfit)} vs ${brl(prev.grossProfit)} → ${deltaPercent(cur.grossProfit, prev.grossProfit)?.toFixed(1)}%`
);
console.log(`margem ${cur.margin.toFixed(1)}% (antes ${prev.margin.toFixed(1)}%)`);
console.log(
  "canais: " +
    salesByChannel(filterSales(state, p30.current))
      .map((c) => `${c.name} ${brl(c.value)}`)
      .join(" | ")
);
console.log(
  "top produtos: " +
    topProducts(state, filterSales(state, p30.current), 3)
      .map((p) => p.name)
      .join(" | ")
);

console.log("\n=== DRE (julho) ===");
const dre = incomeStatement(state, resolvePeriod("mes_anterior").current);
console.log(`faturamento bruto ${brl(dre.grossRevenue)}`);
console.log(`(-) descontos ${brl(dre.discounts)}`);
console.log(`(=) receita líquida ${brl(dre.netRevenue)}`);
console.log(`(-) CMV ${brl(dre.cogs)}`);
console.log(`(=) lucro bruto ${brl(dre.grossProfit)}`);
console.log(
  `(-) despesas ${brl(dre.operatingExpenses)} · taxas ${brl(dre.cardFees)} · comissões ${brl(dre.commissions)} · impostos ${brl(dre.taxes)}`
);
console.log(
  `(=) lucro líquido ${brl(dre.netProfit)} (margem ${dre.netMargin.toFixed(1)}%)`
);

console.log("\n=== FLUXO DE CAIXA ===");
const flow = cashFlow(state, 30, 30);
console.log(
  `saldo atual ${brl(flow.currentBalance)} · mínimo projetado ${brl(flow.minProjected)}`
);

console.log("\n=== EQUIPE (julho) ===");
for (const s of sellerPerformance(
  state,
  filterSales(state, resolvePeriod("mes_anterior").current)
)) {
  console.log(
    `  ${s.seller.name}: ${brl(s.revenue)} · ${s.goalPercent.toFixed(0)}% da meta · margem ${s.margin.toFixed(1)}% · comissão ${brl(s.commission)}`
  );
}

console.log("\n=== CLIENTES ===");
const stats = customerStats(state);
const bySegment = new Map<string, number>();
for (const s of stats) bySegment.set(s.segment, (bySegment.get(s.segment) ?? 0) + 1);
console.log([...bySegment].map(([k, v]) => `${k}: ${v}`).join(" | "));
console.log(`inativos +120d: ${inactiveCustomers(state, 120).length}`);

console.log("\n=== ALERTAS ===");
for (const alert of buildAlerts(state)) {
  console.log(`  [${alert.priority}] ${alert.title}`);
}
