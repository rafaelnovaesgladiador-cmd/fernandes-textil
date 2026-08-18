import {
  addDays,
  dayKey,
  DEMO_TODAY,
  DEMO_TODAY_START,
  diffDays,
  monthKey,
} from "@/lib/dates";
import type { AppState } from "@/lib/store/state";
import type {
  Customer,
  PaymentMethod,
  Product,
  ProductVariant,
  Sale,
  SalesChannel,
  Seller,
} from "@/lib/types";
import { CHANNEL_LABELS, PAYMENT_LABELS } from "@/lib/types";

/**
 * Indicadores derivados do estado da loja.
 *
 * Toda função recebe o estado e calcula sob demanda: qualquer operação do
 * usuário (venda, ajuste de estoque, pagamento) reflete imediatamente em
 * todos os módulos, sem duplicação de números.
 */

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
        previous: {
          from: addDays(DEMO_TODAY_START, -7),
          to: addDays(DEMO_TODAY_START, -6),
        },
        compareLabel: "em relação ao mesmo dia da semana passada",
      };
    case "ontem":
      return {
        current: { from: addDays(DEMO_TODAY_START, -1), to: DEMO_TODAY_START },
        previous: {
          from: addDays(DEMO_TODAY_START, -8),
          to: addDays(DEMO_TODAY_START, -7),
        },
        compareLabel: "em relação ao mesmo dia da semana passada",
      };
    case "7d":
      return {
        current: { from: addDays(DEMO_TODAY_START, -6), to: endOfToday },
        previous: {
          from: addDays(DEMO_TODAY_START, -13),
          to: addDays(DEMO_TODAY_START, -6),
        },
        compareLabel: "em relação à semana anterior",
      };
    case "30d":
      return {
        current: { from: addDays(DEMO_TODAY_START, -29), to: endOfToday },
        previous: {
          from: addDays(DEMO_TODAY_START, -59),
          to: addDays(DEMO_TODAY_START, -29),
        },
        compareLabel: "em relação aos 30 dias anteriores",
      };
    case "mes":
      return {
        current: { from: new Date("2026-08-01T00:00:00-03:00"), to: endOfToday },
        previous: {
          from: new Date("2026-07-01T00:00:00-03:00"),
          to: new Date("2026-08-01T00:00:00-03:00"),
        },
        compareLabel: "em relação ao mês passado",
      };
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

/** Vendas que entram no faturamento (canceladas e devolvidas ficam de fora). */
export function isRevenueSale(sale: Sale): boolean {
  return sale.status === "finalizada" || sale.status === "trocada";
}

function inRange(dateIso: string, range: DateRange): boolean {
  const time = new Date(dateIso).getTime();
  return time >= range.from.getTime() && time < range.to.getTime();
}

export function filterSales(
  state: AppState,
  range: DateRange,
  filters?: Pick<DashboardFilters, "channel" | "sellerId">
): Sale[] {
  return state.sales.filter((sale) => {
    if (!inRange(sale.date, range)) return false;
    if (filters && filters.channel !== "todos" && sale.channel !== filters.channel)
      return false;
    if (
      filters &&
      filters.sellerId !== "todos" &&
      sale.sellerId !== filters.sellerId
    )
      return false;
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
  cost: number;
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
    cost,
  };
}

export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function expensesInRange(state: AppState, range: DateRange): number {
  return state.expenses
    .filter((e) => inRange(e.date, range))
    .reduce((sum, e) => sum + e.amount, 0);
}

// ---------------------------------------------------------------------------
// Séries e composições
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
}

export function salesByCategory(state: AppState, sales: Sale[]): NamedValue[] {
  const productById = new Map(state.products.map((p) => [p.id, p]));
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
    totals.set(
      sale.paymentMethod,
      (totals.get(sale.paymentMethod) ?? 0) + sale.total
    );
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

export function productPerformance(
  state: AppState,
  sales: Sale[]
): ProductPerformance[] {
  const productById = new Map(state.products.map((p) => [p.id, p]));
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
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue);
}

export function topProducts(
  state: AppState,
  sales: Sale[],
  limit = 6
): ProductPerformance[] {
  return productPerformance(state, sales).slice(0, limit);
}

export interface SellerPerformance {
  seller: Seller;
  revenue: number;
  salesCount: number;
  pieces: number;
  ticket: number;
  profit: number;
  margin: number;
  discountAverage: number;
  commission: number;
  goalPercent: number;
  customersServed: number;
  returns: number;
}

export function sellerPerformance(
  state: AppState,
  sales: Sale[]
): SellerPerformance[] {
  return state.sellers
    .map((seller) => {
      const all = sales.filter((s) => s.sellerId === seller.id);
      const own = all.filter(isRevenueSale);
      const revenue = own.reduce((sum, s) => sum + s.total, 0);
      const cost = own.reduce((sum, s) => sum + s.totalCost, 0);
      const profit = revenue - cost;
      const pieces = own.reduce(
        (sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0),
        0
      );
      const grossBeforeDiscount = own.reduce(
        (sum, s) => sum + s.total + s.discount,
        0
      );
      const discountTotal = own.reduce((sum, s) => sum + s.discount, 0);
      const customers = new Set(
        own.map((s) => s.customerId).filter(Boolean) as string[]
      );
      return {
        seller,
        revenue,
        salesCount: own.length,
        pieces,
        ticket: own.length > 0 ? revenue / own.length : 0,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        discountAverage:
          grossBeforeDiscount > 0
            ? (discountTotal / grossBeforeDiscount) * 100
            : 0,
        commission: revenue * (seller.commissionRule.basePercent / 100),
        goalPercent:
          seller.monthlyGoal > 0 ? (revenue / seller.monthlyGoal) * 100 : 0,
        customersServed: customers.size,
        returns: all.filter(
          (s) => s.status === "devolvida" || s.status === "parcialmente_devolvida"
        ).length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

export function variantsByProduct(
  state: AppState
): Map<string, ProductVariant[]> {
  const map = new Map<string, ProductVariant[]>();
  for (const variant of state.variants) {
    const list = map.get(variant.productId) ?? [];
    list.push(variant);
    map.set(variant.productId, list);
  }
  return map;
}

export function stockByProduct(state: AppState): Map<string, number> {
  const map = new Map<string, number>();
  for (const variant of state.variants) {
    map.set(variant.productId, (map.get(variant.productId) ?? 0) + variant.stock);
  }
  return map;
}

export interface StockSummary {
  totalPieces: number;
  stockCost: number;
  stockPotential: number;
  potentialMargin: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  stalled: { count: number; value: number };
}

export function stockSummary(state: AppState): StockSummary {
  const productById = new Map(state.products.map((p) => [p.id, p]));
  let totalPieces = 0;
  let stockCost = 0;
  let stockPotential = 0;

  for (const variant of state.variants) {
    const product = productById.get(variant.productId);
    if (!product) continue;
    totalPieces += variant.stock;
    stockCost += variant.stock * product.cost;
    stockPotential += variant.stock * (product.promoPrice ?? product.price);
  }

  const stock = stockByProduct(state);
  const byProduct = variantsByProduct(state);
  const daysSince = daysSinceLastSaleByProduct(state);

  const lowStockProducts = state.products.filter((p) => {
    if (p.status !== "ativo") return false;
    const list = byProduct.get(p.id) ?? [];
    if (list.length === 0) return false;
    const total = stock.get(p.id) ?? 0;
    if (total === 0) return false;
    const critical = list.filter((v) => v.stock <= 1).length;
    return p.demandWeight >= 7 && critical >= list.length / 2;
  }).length;

  const outOfStockProducts = state.products.filter(
    (p) => p.status === "ativo" && (stock.get(p.id) ?? 0) === 0
  ).length;

  const stalledProducts = state.products.filter(
    (p) => (daysSince.get(p.id) ?? 0) > 90 && (stock.get(p.id) ?? 0) > 0
  );
  const stalledValue = stalledProducts.reduce(
    (sum, p) => sum + (stock.get(p.id) ?? 0) * p.cost,
    0
  );

  return {
    totalPieces,
    stockCost,
    stockPotential,
    potentialMargin:
      stockPotential > 0 ? ((stockPotential - stockCost) / stockPotential) * 100 : 0,
    lowStockProducts,
    outOfStockProducts,
    stalled: { count: stalledProducts.length, value: stalledValue },
  };
}

/** Dias desde a última venda de cada produto. */
export function daysSinceLastSaleByProduct(state: AppState): Map<string, number> {
  const lastSale = new Map<string, string>();
  for (const sale of state.sales) {
    if (!isRevenueSale(sale)) continue;
    for (const item of sale.items) {
      const current = lastSale.get(item.productId);
      if (!current || sale.date > current) lastSale.set(item.productId, sale.date);
    }
  }
  const result = new Map<string, number>();
  for (const product of state.products) {
    const last = lastSale.get(product.id);
    result.set(
      product.id,
      Math.max(
        0,
        last
          ? diffDays(DEMO_TODAY, last)
          : diffDays(DEMO_TODAY, product.entryDate)
      )
    );
  }
  return result;
}

export interface ProductStockAnalysis {
  product: Product;
  stock: number;
  stockCost: number;
  daysSinceLastSale: number;
  /** Unidades vendidas nos últimos 90 dias. */
  sold90: number;
  /** Média mensal de vendas no período analisado. */
  monthlyAverage: number;
  /** Dias de estoque restantes no ritmo atual. */
  coverageDays: number | null;
  revenue90: number;
  abcClass: "A" | "B" | "C";
  needsRestock: boolean;
  isStalled: boolean;
}

/** Curva ABC, giro e cobertura por produto. */
export function stockAnalysis(state: AppState): ProductStockAnalysis[] {
  const range = {
    from: addDays(DEMO_TODAY_START, -89),
    to: addDays(DEMO_TODAY_START, 1),
  };
  const sales = filterSales(state, range);
  const perf = new Map(
    productPerformance(state, sales).map((p) => [p.productId, p])
  );
  const stock = stockByProduct(state);
  const daysSince = daysSinceLastSaleByProduct(state);

  const rows = state.products.map((product) => {
    const sold90 = perf.get(product.id)?.quantity ?? 0;
    const revenue90 = perf.get(product.id)?.revenue ?? 0;
    const monthlyAverage = sold90 / 3;
    const currentStock = stock.get(product.id) ?? 0;
    const dailyRate = sold90 / 90;
    return {
      product,
      stock: currentStock,
      stockCost: currentStock * product.cost,
      daysSinceLastSale: daysSince.get(product.id) ?? 0,
      sold90,
      monthlyAverage,
      coverageDays: dailyRate > 0 ? Math.round(currentStock / dailyRate) : null,
      revenue90,
      abcClass: "C" as "A" | "B" | "C",
      needsRestock: dailyRate > 0 && currentStock / dailyRate < 15,
      isStalled: (daysSince.get(product.id) ?? 0) > 90 && currentStock > 0,
    };
  });

  // Curva ABC: A até 80% do faturamento acumulado, B até 95%, C o restante.
  const ordered = [...rows].sort((a, b) => b.revenue90 - a.revenue90);
  const totalRevenue = ordered.reduce((sum, r) => sum + r.revenue90, 0);
  let accumulated = 0;
  for (const row of ordered) {
    accumulated += row.revenue90;
    const share = totalRevenue > 0 ? accumulated / totalRevenue : 1;
    row.abcClass = share <= 0.8 ? "A" : share <= 0.95 ? "B" : "C";
  }

  return rows;
}

/** Distribuição de estoque por tamanho dentro de uma categoria. */
export function stockBySize(state: AppState, category?: string): NamedValue[] {
  const productById = new Map(state.products.map((p) => [p.id, p]));
  const totals = new Map<string, number>();
  for (const variant of state.variants) {
    const product = productById.get(variant.productId);
    if (!product) continue;
    if (category && product.category !== category) continue;
    totals.set(variant.size, (totals.get(variant.size) ?? 0) + variant.stock);
  }
  const order = ["P", "M", "G", "GG", "U"];
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
}

export function stockByCategory(state: AppState): NamedValue[] {
  const productById = new Map(state.products.map((p) => [p.id, p]));
  const totals = new Map<string, number>();
  for (const variant of state.variants) {
    const product = productById.get(variant.productId);
    if (!product) continue;
    totals.set(
      product.category,
      (totals.get(product.category) ?? 0) + variant.stock * product.cost
    );
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export interface CustomerStats {
  customer: Customer;
  totalSpent: number;
  purchases: number;
  ticket: number;
  firstPurchase?: string;
  lastPurchase?: string;
  daysSinceLastPurchase: number | null;
  pieces: number;
  openBalance: number;
  discountsReceived: number;
  favoriteCategory?: string;
  segment: "vip" | "novo" | "recorrente" | "inativo" | "sem_compra";
}

export function customerStats(state: AppState): CustomerStats[] {
  const productById = new Map(state.products.map((p) => [p.id, p]));
  const byCustomer = new Map<string, Sale[]>();
  for (const sale of state.sales) {
    if (!sale.customerId || !isRevenueSale(sale)) continue;
    const list = byCustomer.get(sale.customerId) ?? [];
    list.push(sale);
    byCustomer.set(sale.customerId, list);
  }

  const openByCustomer = new Map<string, number>();
  for (const receivable of state.receivables) {
    if (!receivable.customerId || receivable.status === "recebido") continue;
    openByCustomer.set(
      receivable.customerId,
      (openByCustomer.get(receivable.customerId) ?? 0) + receivable.amount
    );
  }

  const allSpent = [...byCustomer.values()].map((sales) =>
    sales.reduce((sum, s) => sum + s.total, 0)
  );
  const vipThreshold = allSpent.length
    ? [...allSpent].sort((a, b) => b - a)[Math.floor(allSpent.length * 0.15)] ?? 0
    : 0;

  return state.customers.map((customer) => {
    const sales = (byCustomer.get(customer.id) ?? []).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const totalSpent = sales.reduce((sum, s) => sum + s.total, 0);
    const pieces = sales.reduce(
      (sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0),
      0
    );
    const first = sales[0]?.date;
    const last = sales[sales.length - 1]?.date;
    const daysSince = last ? diffDays(DEMO_TODAY, last) : null;

    const categoryTotals = new Map<string, number>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const category = productById.get(item.productId)?.category;
        if (!category) continue;
        categoryTotals.set(
          category,
          (categoryTotals.get(category) ?? 0) + item.quantity
        );
      }
    }
    const favorite = [...categoryTotals.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const daysSinceSignup = diffDays(DEMO_TODAY, customer.createdAt);
    const segment: CustomerStats["segment"] =
      sales.length === 0
        ? "sem_compra"
        : daysSince !== null && daysSince > 120
          ? "inativo"
          : totalSpent >= vipThreshold && vipThreshold > 0
            ? "vip"
            : daysSinceSignup <= 60
              ? "novo"
              : sales.length >= 3
                ? "recorrente"
                : "novo";

    return {
      customer,
      totalSpent,
      purchases: sales.length,
      ticket: sales.length > 0 ? totalSpent / sales.length : 0,
      firstPurchase: first,
      lastPurchase: last,
      daysSinceLastPurchase: daysSince,
      pieces,
      openBalance: openByCustomer.get(customer.id) ?? 0,
      discountsReceived: sales.reduce((sum, s) => sum + s.discount, 0),
      favoriteCategory: favorite,
      segment,
    };
  });
}

export function inactiveCustomers(state: AppState, thresholdDays = 120) {
  return customerStats(state).filter(
    (stat) =>
      (stat.daysSinceLastPurchase !== null &&
        stat.daysSinceLastPurchase > thresholdDays) ||
      (stat.purchases === 0 &&
        diffDays(DEMO_TODAY, stat.customer.createdAt) > thresholdDays)
  );
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export function openReceivables(state: AppState): number {
  return state.receivables
    .filter((r) => r.status !== "recebido")
    .reduce((sum, r) => sum + r.amount, 0);
}

export function openPayables(state: AppState): number {
  return state.payables
    .filter((p) => p.status !== "pago")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function overdueReceivables(state: AppState) {
  return state.receivables.filter(
    (r) =>
      r.status !== "recebido" &&
      new Date(r.dueDate).getTime() < DEMO_TODAY.getTime()
  );
}

export function overduePayables(state: AppState) {
  return state.payables.filter(
    (p) =>
      p.status !== "pago" && new Date(p.dueDate).getTime() < DEMO_TODAY.getTime()
  );
}

export interface IncomeStatement {
  grossRevenue: number;
  discounts: number;
  returns: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  cardFees: number;
  commissions: number;
  taxes: number;
  netProfit: number;
  netMargin: number;
}

/** DRE simplificada do período. */
export function incomeStatement(
  state: AppState,
  range: DateRange
): IncomeStatement {
  const sales = filterSales(state, range);
  const valid = sales.filter(isRevenueSale);

  const grossRevenue = valid.reduce((sum, s) => sum + s.total + s.discount, 0);
  const discounts = valid.reduce((sum, s) => sum + s.discount, 0);
  const returns = sales
    .filter((s) => s.status === "devolvida" || s.status === "parcialmente_devolvida")
    .reduce((sum, s) => sum + s.total, 0);
  const netRevenue = grossRevenue - discounts;
  const cogs = valid.reduce((sum, s) => sum + s.totalCost, 0);
  const grossProfit = netRevenue - cogs;

  const expenses = state.expenses.filter((e) => inRange(e.date, range));
  const cardFees = expenses
    .filter((e) => e.category === "taxas_cartao")
    .reduce((sum, e) => sum + e.amount, 0);
  const taxes = expenses
    .filter((e) => e.category === "impostos")
    .reduce((sum, e) => sum + e.amount, 0);
  const operatingExpenses = expenses
    .filter((e) => e.category !== "taxas_cartao" && e.category !== "impostos")
    .reduce((sum, e) => sum + e.amount, 0);

  const commissions = sellerPerformance(state, sales).reduce(
    (sum, s) => sum + s.commission,
    0
  );

  const netProfit =
    grossProfit - operatingExpenses - cardFees - taxes - commissions;

  return {
    grossRevenue,
    discounts,
    returns,
    netRevenue,
    cogs,
    grossProfit,
    operatingExpenses,
    cardFees,
    commissions,
    taxes,
    netProfit,
    netMargin: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
  };
}

export interface CashFlowPoint {
  key: string;
  date: Date;
  inflow: number;
  outflow: number;
  balance: number;
}

/**
 * Fluxo de caixa: histórico realizado e projeção pelas contas em aberto.
 * A partir de hoje as barras representam previsão.
 */
export function cashFlow(
  state: AppState,
  daysBack = 30,
  daysAhead = 30
): { points: CashFlowPoint[]; currentBalance: number; minProjected: number } {
  const start = addDays(DEMO_TODAY_START, -daysBack);
  const end = addDays(DEMO_TODAY_START, daysAhead + 1);

  const buckets = new Map<string, CashFlowPoint>();
  for (
    let cursor = start;
    cursor.getTime() < end.getTime();
    cursor = addDays(cursor, 1)
  ) {
    buckets.set(dayKey(cursor), {
      key: dayKey(cursor),
      date: cursor,
      inflow: 0,
      outflow: 0,
      balance: 0,
    });
  }

  const add = (dateIso: string, inflow: number, outflow: number) => {
    const bucket = buckets.get(dayKey(dateIso));
    if (!bucket) return;
    bucket.inflow += inflow;
    bucket.outflow += outflow;
  };

  for (const sale of state.sales) {
    if (!isRevenueSale(sale) || sale.paymentMethod === "crediario") continue;
    add(sale.date, sale.total, 0);
  }
  for (const receivable of state.receivables) {
    add(receivable.dueDate, receivable.amount, 0);
  }
  for (const expense of state.expenses) {
    add(expense.date, 0, expense.amount);
  }
  for (const payable of state.payables) {
    if (payable.status === "pago") continue;
    add(payable.dueDate, 0, payable.amount);
  }

  const points = [...buckets.values()];
  const todayKey = dayKey(DEMO_TODAY);

  // O saldo de hoje é ancorado em uma janela fixa (caixa aberto + resultado dos
  // últimos 30 dias). Sem isso, o saldo mudaria conforme o período consultado —
  // e o gráfico contradiria os alertas.
  const cashOnHand = state.cashSessions
    .filter((s) => !s.closedAt)
    .reduce(
      (sum, s) => sum + s.movements.reduce((acc, m) => acc + m.amount, 0),
      0
    );
  const anchorFrom = addDays(DEMO_TODAY_START, -29);
  const anchorRange = { from: anchorFrom, to: addDays(DEMO_TODAY_START, 1) };
  const received = state.sales
    .filter(
      (s) =>
        isRevenueSale(s) &&
        s.paymentMethod !== "crediario" &&
        inRange(s.date, anchorRange)
    )
    .reduce((sum, s) => sum + s.total, 0);
  const receivedInstallments = state.receivables
    .filter((r) => r.status === "recebido" && inRange(r.dueDate, anchorRange))
    .reduce((sum, r) => sum + r.amount, 0);
  const paid = state.expenses
    .filter((e) => inRange(e.date, anchorRange))
    .reduce((sum, e) => sum + e.amount, 0);
  const todayBalance = cashOnHand + received + receivedInstallments - paid;

  // Distribui o saldo a partir de hoje: para trás subtraindo o movimento do
  // próprio dia, para frente somando o do dia seguinte.
  const todayIndex = points.findIndex((p) => p.key === todayKey);
  const pivot = todayIndex >= 0 ? todayIndex : points.length - 1;
  if (points[pivot]) points[pivot].balance = todayBalance;
  for (let i = pivot - 1; i >= 0; i--) {
    points[i].balance =
      points[i + 1].balance - (points[i + 1].inflow - points[i + 1].outflow);
  }
  for (let i = pivot + 1; i < points.length; i++) {
    points[i].balance =
      points[i - 1].balance + (points[i].inflow - points[i].outflow);
  }

  let minProjected = Number.POSITIVE_INFINITY;
  for (let i = pivot; i < points.length; i++) {
    minProjected = Math.min(minProjected, points[i].balance);
  }

  return {
    points,
    currentBalance: todayBalance,
    minProjected: Number.isFinite(minProjected) ? minProjected : todayBalance,
  };
}

export function expensesByCategory(
  state: AppState,
  range: DateRange
): NamedValue[] {
  const totals = new Map<string, number>();
  for (const expense of state.expenses) {
    if (!inRange(expense.date, range)) continue;
    totals.set(
      expense.category,
      (totals.get(expense.category) ?? 0) + expense.amount
    );
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function monthlyExpenseSeries(
  state: AppState
): Array<{ month: string; total: number }> {
  const totals = new Map<string, number>();
  for (const expense of state.expenses) {
    const key = monthKey(expense.date);
    totals.set(key, (totals.get(key) ?? 0) + expense.amount);
  }
  return [...totals.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// ---------------------------------------------------------------------------
// Metas e visão executiva
// ---------------------------------------------------------------------------

export function currentGoal(state: AppState) {
  return state.goals.find((g) => g.month === monthKey(DEMO_TODAY));
}

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

export function executiveSummary(state: AppState): ExecutiveSummary {
  const todayRange = resolvePeriod("hoje").current;
  const monthRange = resolvePeriod("mes").current;
  const month = summarize(filterSales(state, monthRange));
  const monthExpenses = expensesInRange(state, monthRange);
  const goal = currentGoal(state);
  return {
    today: summarize(filterSales(state, todayRange)),
    month,
    monthExpenses,
    netProfit: month.grossProfit - monthExpenses,
    goal: goal
      ? {
          target: goal.revenueTarget,
          percent: (month.revenue / goal.revenueTarget) * 100,
        }
      : undefined,
    receivables: openReceivables(state),
    payables: openPayables(state),
    stock: stockSummary(state),
  };
}
