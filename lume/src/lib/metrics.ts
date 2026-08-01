import {
  addDays,
  dayKey,
  DEMO_TODAY,
  DEMO_TODAY_START,
  diffDays,
  monthKey,
} from "@/lib/dates";
import {
  demoCustomers,
  demoExpenses,
  demoGoals,
  demoPayables,
  demoProducts,
  demoReceivables,
  demoSales,
  demoSellers,
  demoVariants,
} from "@/lib/mock";
import type {
  PaymentMethod,
  Sale,
  SalesChannel,
  Seller,
} from "@/lib/types";
import { CHANNEL_LABELS, PAYMENT_LABELS } from "@/lib/types";

/** Filtros aplicáveis a todo o Dashboard. */
export interface DashboardFilters {
  period: PeriodKey;
  channel: SalesChannel | "todos";
  sellerId: string | "todos";
}

export type PeriodKey =
  | "hoje"
  | "ontem"
  | "7d"
  | "30d"
  | "mes"
  | "mes_anterior";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
  mes_anterior: "Mês anterior",
};

export interface DateRange {
  from: Date;
  to: Date;
}

/** Intervalo do período e o intervalo imediatamente anterior (comparação). */
export function resolvePeriod(period: PeriodKey): {
  current: DateRange;
  previous: DateRange;
  compareLabel: string;
} {
  const endOfToday = addDays(DEMO_TODAY_START, 1);
  switch (period) {
    case "hoje":
      return {
        current: { from: DEMO_TODAY_START, to: endOfToday },
        previous: { from: addDays(DEMO_TODAY_START, -7), to: addDays(DEMO_TODAY_START, -6) },
        compareLabel: "em relação ao mesmo dia da semana passada",
      };
    case "ontem":
      return {
        current: { from: addDays(DEMO_TODAY_START, -1), to: DEMO_TODAY_START },
        previous: { from: addDays(DEMO_TODAY_START, -8), to: addDays(DEMO_TODAY_START, -7) },
        compareLabel: "em relação ao mesmo dia da semana passada",
      };
    case "7d":
      return {
        current: { from: addDays(DEMO_TODAY_START, -6), to: endOfToday },
        previous: { from: addDays(DEMO_TODAY_START, -13), to: addDays(DEMO_TODAY_START, -6) },
        compareLabel: "em relação à semana anterior",
      };
    case "30d":
      return {
        current: { from: addDays(DEMO_TODAY_START, -29), to: endOfToday },
        previous: { from: addDays(DEMO_TODAY_START, -59), to: addDays(DEMO_TODAY_START, -29) },
        compareLabel: "em relação aos 30 dias anteriores",
      };
    case "mes": {
      const from = new Date("2026-08-01T00:00:00-03:00");
      return {
        current: { from, to: endOfToday },
        // Julho completo como comparação (mês cheio mais recente).
        previous: {
          from: new Date("2026-07-01T00:00:00-03:00"),
          to: new Date("2026-08-01T00:00:00-03:00"),
        },
        compareLabel: "em relação ao mês passado",
      };
    }
    case "mes_anterior":
      return {
        current: {
          from: new Date("2026-07-01T00:00:00-03:00"),
          to: new Date("2026-08-01T00:00:00-03:00"),
        },
        previous: {
          from: new Date("2026-06-01T00:00:00-03:00"),
          to: new Date("2026-07-01T00:00:00-03:00"),
        },
        compareLabel: "em relação a junho",
      };
  }
}

function isRevenueSale(sale: Sale): boolean {
  return sale.status === "finalizada" || sale.status === "trocada";
}

function inRange(sale: Sale, range: DateRange): boolean {
  const t = new Date(sale.date).getTime();
  return t >= range.from.getTime() && t < range.to.getTime();
}

export function filterSales(
  range: DateRange,
  filters?: Pick<DashboardFilters, "channel" | "sellerId">
): Sale[] {
  return demoSales.filter((sale) => {
    if (!inRange(sale, range)) return false;
    if (filters && filters.channel !== "todos" && sale.channel !== filters.channel) return false;
    if (filters && filters.sellerId !== "todos" && sale.sellerId !== filters.sellerId) return false;
    return true;
  });
}

export interface PeriodSummary {
  revenue: number;
  grossProfit: number;
  salesCount: number;
  pieces: number;
  ticket: number;
  discountTotal: number;
  margin: number;
}

export function summarize(sales: Sale[]): PeriodSummary {
  const valid = sales.filter(isRevenueSale);
  const revenue = valid.reduce((sum, s) => sum + s.total, 0);
  const cost = valid.reduce((sum, s) => sum + s.totalCost, 0);
  const pieces = valid.reduce(
    (sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0),
    0
  );
  const discountTotal = valid.reduce((sum, s) => sum + s.discount, 0);
  const grossProfit = revenue - cost;
  return {
    revenue,
    grossProfit,
    salesCount: valid.length,
    pieces,
    ticket: valid.length > 0 ? revenue / valid.length : 0,
    discountTotal,
    margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
  };
}

export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Despesas dentro do intervalo. */
export function expensesInRange(range: DateRange): number {
  return demoExpenses
    .filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= range.from.getTime() && t < range.to.getTime();
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

// ---------------------------------------------------------------------------
// Séries para gráficos
// ---------------------------------------------------------------------------

export interface DailyPoint {
  key: string;
  date: Date;
  revenue: number;
  profit: number;
}

export function dailySeries(range: DateRange, sales: Sale[]): DailyPoint[] {
  const buckets = new Map<string, DailyPoint>();
  for (
    let cursor = range.from;
    cursor.getTime() < range.to.getTime();
    cursor = addDays(cursor, 1)
  ) {
    buckets.set(dayKey(cursor), {
      key: dayKey(cursor),
      date: cursor,
      revenue: 0,
      profit: 0,
    });
  }
  for (const sale of sales) {
    if (!isRevenueSale(sale)) continue;
    const bucket = buckets.get(dayKey(sale.date));
    if (!bucket) continue;
    bucket.revenue += sale.total;
    bucket.profit += sale.total - sale.totalCost;
  }
  return [...buckets.values()];
}

export interface NamedValue {
  name: string;
  value: number;
  secondary?: number;
}

export function salesByCategory(sales: Sale[]): NamedValue[] {
  const productById = new Map(demoProducts.map((p) => [p.id, p]));
  const totals = new Map<string, number>();
  for (const sale of sales) {
    if (!isRevenueSale(sale)) continue;
    for (const item of sale.items) {
      const category = productById.get(item.productId)?.category ?? "Outros";
      totals.set(
        category,
        (totals.get(category) ?? 0) + item.unitPrice * item.quantity
      );
    }
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function salesByChannel(sales: Sale[]): NamedValue[] {
  const totals = new Map<SalesChannel, number>();
  for (const sale of sales) {
    if (!isRevenueSale(sale)) continue;
    totals.set(sale.channel, (totals.get(sale.channel) ?? 0) + sale.total);
  }
  return [...totals.entries()]
    .map(([channel, value]) => ({ name: CHANNEL_LABELS[channel], value }))
    .sort((a, b) => b.value - a.value);
}

export function salesByPayment(sales: Sale[]): NamedValue[] {
  const totals = new Map<PaymentMethod, number>();
  for (const sale of sales) {
    if (!isRevenueSale(sale)) continue;
    totals.set(sale.paymentMethod, (totals.get(sale.paymentMethod) ?? 0) + sale.total);
  }
  return [...totals.entries()]
    .map(([method, value]) => ({ name: PAYMENT_LABELS[method], value }))
    .sort((a, b) => b.value - a.value);
}

export interface ProductPerformance {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export function topProducts(sales: Sale[], limit = 6): ProductPerformance[] {
  const productById = new Map(demoProducts.map((p) => [p.id, p]));
  const totals = new Map<string, ProductPerformance>();
  for (const sale of sales) {
    if (!isRevenueSale(sale)) continue;
    for (const item of sale.items) {
      const product = productById.get(item.productId);
      if (!product) continue;
      const entry = totals.get(product.id) ?? {
        productId: product.id,
        name: product.name,
        category: product.category,
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      entry.quantity += item.quantity;
      entry.revenue += item.unitPrice * item.quantity;
      entry.profit += (item.unitPrice - item.unitCost) * item.quantity;
      totals.set(product.id, entry);
    }
  }
  return [...totals.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface SellerPerformance {
  seller: Seller;
  revenue: number;
  salesCount: number;
  pieces: number;
  ticket: number;
  profit: number;
  commission: number;
  goalPercent: number;
}

export function sellerPerformance(sales: Sale[]): SellerPerformance[] {
  return demoSellers
    .map((seller) => {
      const own = sales.filter((s) => s.sellerId === seller.id && isRevenueSale(s));
      const revenue = own.reduce((sum, s) => sum + s.total, 0);
      const profit = own.reduce((sum, s) => sum + (s.total - s.totalCost), 0);
      const pieces = own.reduce(
        (sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0),
        0
      );
      return {
        seller,
        revenue,
        salesCount: own.length,
        pieces,
        ticket: own.length > 0 ? revenue / own.length : 0,
        profit,
        commission: revenue * (seller.commissionRule.basePercent / 100),
        goalPercent: seller.monthlyGoal > 0 ? (revenue / seller.monthlyGoal) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

export interface StockSummary {
  totalPieces: number;
  stockCost: number;
  stockPotential: number;
  lowStockProducts: number;
  stalled: { count: number; value: number };
}

export function stockSummary(): StockSummary {
  const productById = new Map(demoProducts.map((p) => [p.id, p]));
  let totalPieces = 0;
  let stockCost = 0;
  let stockPotential = 0;

  const stockByProduct = new Map<string, number>();
  for (const variant of demoVariants) {
    const product = productById.get(variant.productId);
    if (!product) continue;
    totalPieces += variant.stock;
    stockCost += variant.stock * product.cost;
    stockPotential += variant.stock * (product.promoPrice ?? product.price);
    stockByProduct.set(
      variant.productId,
      (stockByProduct.get(variant.productId) ?? 0) + variant.stock
    );
  }

  const variantsByProductId = new Map<string, typeof demoVariants>();
  for (const variant of demoVariants) {
    const list = variantsByProductId.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProductId.set(variant.productId, list);
  }

  // Alto giro com metade ou mais das variações quase zeradas = repor.
  const lowStockProducts = demoProducts.filter((p) => {
    if (p.demandWeight < 7) return false;
    const list = variantsByProductId.get(p.id) ?? [];
    if (list.length === 0) return false;
    const critical = list.filter((v) => v.stock <= 1).length;
    return critical >= list.length / 2;
  }).length;

  const stalledProducts = demoProducts.filter(
    (p) => p.demandWeight === 0 && (stockByProduct.get(p.id) ?? 0) > 0
  );
  const stalledValue = stalledProducts.reduce(
    (sum, p) => sum + (stockByProduct.get(p.id) ?? 0) * p.cost,
    0
  );

  return {
    totalPieces,
    stockCost,
    stockPotential,
    lowStockProducts,
    stalled: { count: stalledProducts.length, value: stalledValue },
  };
}

// ---------------------------------------------------------------------------
// Financeiro / metas / clientes
// ---------------------------------------------------------------------------

export function openReceivables(): number {
  return demoReceivables
    .filter((r) => r.status !== "recebido")
    .reduce((sum, r) => sum + r.amount, 0);
}

export function openPayables(): number {
  return demoPayables
    .filter((p) => p.status !== "pago")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function currentGoal() {
  const key = monthKey(DEMO_TODAY);
  return demoGoals.find((g) => g.month === key);
}

export function inactiveCustomers(thresholdDays = 120) {
  const lastPurchase = new Map<string, string>();
  for (const sale of demoSales) {
    if (!sale.customerId || !isRevenueSale(sale)) continue;
    const current = lastPurchase.get(sale.customerId);
    if (!current || sale.date > current) lastPurchase.set(sale.customerId, sale.date);
  }
  return demoCustomers.filter((customer) => {
    const last = lastPurchase.get(customer.id);
    if (!last) return diffDays(DEMO_TODAY, customer.createdAt) > thresholdDays;
    return diffDays(DEMO_TODAY, last) > thresholdDays;
  });
}

/** Dias desde a última venda de cada produto (para "produtos parados"). */
export function daysSinceLastSaleByProduct(): Map<string, number> {
  const lastSale = new Map<string, string>();
  for (const sale of demoSales) {
    if (!isRevenueSale(sale)) continue;
    for (const item of sale.items) {
      const current = lastSale.get(item.productId);
      if (!current || sale.date > current) lastSale.set(item.productId, sale.date);
    }
  }
  const result = new Map<string, number>();
  for (const product of demoProducts) {
    const last = lastSale.get(product.id);
    result.set(
      product.id,
      last ? diffDays(DEMO_TODAY, last) : diffDays(DEMO_TODAY, product.entryDate)
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// Visão executiva (KPIs do Dashboard)
// ---------------------------------------------------------------------------

export interface ExecutiveSummary {
  today: PeriodSummary;
  month: PeriodSummary;
  monthExpenses: number;
  netProfit: number;
  goal?: { target: number; percent: number };
  receivables: number;
  payables: number;
  stock: StockSummary;
}

export function executiveSummary(): ExecutiveSummary {
  const todayRange = resolvePeriod("hoje").current;
  const monthRange = resolvePeriod("mes").current;
  const month = summarize(filterSales(monthRange));
  const monthExpenses = expensesInRange(monthRange);
  const goal = currentGoal();
  return {
    today: summarize(filterSales(todayRange)),
    month,
    monthExpenses,
    netProfit: month.grossProfit - monthExpenses,
    goal: goal
      ? { target: goal.revenueTarget, percent: (month.revenue / goal.revenueTarget) * 100 }
      : undefined,
    receivables: openReceivables(),
    payables: openPayables(),
    stock: stockSummary(),
  };
}
