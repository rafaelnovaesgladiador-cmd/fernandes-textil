"use client";

import { addDays, DEMO_TODAY } from "@/lib/dates";
import { demoUser } from "@/lib/mock";
import type {
  ActivityLog,
  Alert,
  Campaign,
  CashMovementType,
  CashSession,
  CompanySettings,
  Customer,
  CustomerInteraction,
  Expense,
  Payable,
  Product,
  ProductSize,
  ProductVariant,
  Purchase,
  PurchaseItem,
  Receivable,
  Sale,
  SaleItem,
  SalesChannel,
  PaymentMethod,
  StockMovement,
  StockMovementType,
} from "@/lib/types";
import { bumpCounter, nextId, setState } from "./store";
import type { AppState } from "./state";

/**
 * Ações de negócio — o único caminho para alterar o estado.
 *
 * Cada ação mantém a coerência entre os módulos: uma venda baixa o estoque,
 * registra a movimentação, gera o recebível do crediário e entra no histórico
 * de atividades. É a mesma sequência que virá de transações no banco.
 */

/**
 * Relógio da demonstração: as operações do usuário acontecem "hoje" (01/08/2026),
 * para que apareçam imediatamente nos indicadores do dia. O contador de minutos
 * preserva a ordem cronológica entre operações da mesma sessão.
 */
let clockOffset = 0;
function demoNow(): string {
  clockOffset += 1;
  return new Date(DEMO_TODAY.getTime() + clockOffset * 60_000).toISOString();
}

function logEntry(
  state: AppState,
  action: string,
  entity: string,
  detail: string
): ActivityLog {
  return {
    id: nextId("log", state),
    companyId: state.companyId,
    userId: demoUser.id,
    userName: demoUser.name,
    action,
    entity,
    detail,
    date: demoNow(),
  };
}


const money = (value: number) => Math.round(value * 100) / 100;

// ---------------------------------------------------------------------------
// Vendas
// ---------------------------------------------------------------------------

export interface SaleDraftItem {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface CreateSaleInput {
  items: SaleDraftItem[];
  customerId?: string;
  sellerId: string;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  installments: number;
  /** Desconto em reais sobre o total. */
  discount: number;
  notes?: string;
}

export interface CreateSaleResult {
  ok: boolean;
  saleId?: string;
  code?: string;
  error?: string;
}

export function createSale(input: CreateSaleInput): CreateSaleResult {
  let result: CreateSaleResult = { ok: false, error: "Falha ao registrar." };

  setState((state) => {
    if (input.items.length === 0) {
      result = { ok: false, error: "Adicione ao menos um produto." };
      return state;
    }

    // Confere disponibilidade antes de alterar qualquer coisa.
    const required = new Map<string, number>();
    for (const item of input.items) {
      required.set(
        item.variantId,
        (required.get(item.variantId) ?? 0) + item.quantity
      );
    }
    for (const [variantId, quantity] of required) {
      const variant = state.variants.find((v) => v.id === variantId);
      if (!variant || variant.stock < quantity) {
        result = {
          ok: false,
          error: `Estoque insuficiente para ${variant?.sku ?? "o item"}.`,
        };
        return state;
      }
    }

    const saleId = nextId("ven", state);
    const saleNumber = (state.counters["ven"] ?? 0) + 1;
    const code = `#${2000 + saleNumber}`;
    const date = demoNow();

    const gross = input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const discount = money(Math.min(input.discount, gross));
    const total = money(gross - discount);
    const totalCost = input.items.reduce(
      (sum, item) => sum + item.unitCost * item.quantity,
      0
    );

    const items: SaleItem[] = input.items.map((item, index) => ({
      id: `${saleId}_i${index + 1}`,
      saleId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost,
      discount: 0,
    }));

    const sale: Sale = {
      id: saleId,
      companyId: state.companyId,
      unitId: state.units[0].id,
      code,
      customerId: input.customerId,
      sellerId: input.sellerId,
      channel: input.channel,
      paymentMethod: input.paymentMethod,
      installments: input.installments,
      status: "finalizada",
      discount,
      total,
      totalCost: money(totalCost),
      date,
      items,
    };

    // Baixa de estoque + rastro de movimentação por variação.
    const movements: StockMovement[] = [];
    let counters = bumpCounter(state.counters, "ven");
    const variants = state.variants.map((variant) => {
      const quantity = required.get(variant.id);
      if (!quantity) return variant;
      const item = input.items.find((i) => i.variantId === variant.id)!;
      counters = bumpCounter(counters, "mov");
      movements.push({
        id: `mov_${String(counters["mov"]).padStart(4, "0")}`,
        companyId: state.companyId,
        unitId: state.units[0].id,
        variantId: variant.id,
        productId: item.productId,
        type: "saida",
        quantity: -quantity,
        reason: `Venda ${code}`,
        userId: demoUser.id,
        date,
      });
      return { ...variant, stock: variant.stock - quantity };
    });

    // Crediário gera parcelas em aberto no contas a receber.
    const receivables: Receivable[] = [];
    if (input.paymentMethod === "crediario" && input.installments > 0) {
      const customer = state.customers.find((c) => c.id === input.customerId);
      const installmentValue = money(total / input.installments);
      for (let n = 1; n <= input.installments; n++) {
        counters = bumpCounter(counters, "rec");
        receivables.push({
          id: `rec_${String(counters["rec"]).padStart(4, "0")}`,
          companyId: state.companyId,
          saleId,
          customerId: input.customerId,
          description: `Crediário ${code} — parcela ${n}/${input.installments}${
            customer ? ` · ${customer.name}` : ""
          }`,
          amount: installmentValue,
          dueDate: addDays(new Date(date), n * 30).toISOString(),
          status: "aberto",
        });
      }
    }

    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Venda finalizada",
      "Venda",
      `Venda ${code} — ${items.length} ${items.length === 1 ? "item" : "itens"}, ${
        input.paymentMethod === "crediario"
          ? `crediário em ${input.installments}x`
          : input.paymentMethod
      }`
    );

    result = { ok: true, saleId, code };

    return {
      ...state,
      sales: [sale, ...state.sales],
      variants,
      stockMovements: [...movements, ...state.stockMovements],
      receivables: [...receivables, ...state.receivables],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });

  return result;
}

/** Cancela ou devolve uma venda, repondo o estoque. */
export function changeSaleStatus(
  saleId: string,
  status: "cancelada" | "devolvida"
): void {
  setState((state) => {
    const sale = state.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === status) return state;

    const restock = sale.status === "finalizada" || sale.status === "trocada";
    let counters = state.counters;
    const movements: StockMovement[] = [];
    const date = demoNow();

    const variants = restock
      ? state.variants.map((variant) => {
          const item = sale.items.find((i) => i.variantId === variant.id);
          if (!item) return variant;
          counters = bumpCounter(counters, "mov");
          movements.push({
            id: `mov_${String(counters["mov"]).padStart(4, "0")}`,
            companyId: state.companyId,
            unitId: sale.unitId,
            variantId: variant.id,
            productId: item.productId,
            type: status === "cancelada" ? "entrada" : "devolucao",
            quantity: item.quantity,
            reason: `${status === "cancelada" ? "Cancelamento" : "Devolução"} da venda ${sale.code}`,
            userId: demoUser.id,
            date,
          });
          return { ...variant, stock: variant.stock + item.quantity };
        })
      : state.variants;

    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      status === "cancelada" ? "Venda cancelada" : "Venda devolvida",
      "Venda",
      `Venda ${sale.code} — estoque reposto`
    );

    return {
      ...state,
      sales: state.sales.map((s) => (s.id === saleId ? { ...s, status } : s)),
      variants,
      stockMovements: [...movements, ...state.stockMovements],
      // Parcelas de crediário em aberto deixam de ser devidas.
      receivables: state.receivables.map((r) =>
        r.saleId === saleId && r.status !== "recebido"
          ? { ...r, status: "recebido" as const, amount: 0 }
          : r
      ),
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

export function adjustStock(input: {
  variantId: string;
  newQuantity: number;
  type: StockMovementType;
  reason: string;
}): void {
  setState((state) => {
    const variant = state.variants.find((v) => v.id === input.variantId);
    if (!variant) return state;
    const delta = input.newQuantity - variant.stock;
    if (delta === 0) return state;

    const product = state.products.find((p) => p.id === variant.productId);
    let counters = bumpCounter(state.counters, "mov");
    const movement: StockMovement = {
      id: `mov_${String(counters["mov"]).padStart(4, "0")}`,
      companyId: state.companyId,
      unitId: state.units[0].id,
      variantId: variant.id,
      productId: variant.productId,
      type: input.type,
      quantity: delta,
      reason: input.reason,
      userId: demoUser.id,
      date: demoNow(),
    };

    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Ajuste de estoque",
      "Estoque",
      `${product?.name ?? variant.sku} (${variant.color}/${variant.size}): ${variant.stock} → ${input.newQuantity} — ${input.reason}`
    );

    return {
      ...state,
      variants: state.variants.map((v) =>
        v.id === input.variantId ? { ...v, stock: input.newQuantity } : v
      ),
      stockMovements: [movement, ...state.stockMovements],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export interface ProductDraftVariant {
  color: string;
  size: ProductSize;
  stock: number;
}

export interface CreateProductInput {
  name: string;
  description: string;
  category: string;
  collection: string;
  brand: string;
  supplierId: string;
  material: string;
  cost: number;
  price: number;
  promoPrice?: number;
  stockLocation: string;
  minStock: number;
  variants: ProductDraftVariant[];
}

export function createProduct(input: CreateProductInput): string {
  let newId = "";

  setState((state) => {
    let counters = bumpCounter(state.counters, "prd");
    const index = counters["prd"];
    const id = `prd_n${String(index).padStart(3, "0")}`;
    newId = id;
    const date = demoNow();
    const sku = `BM-${input.category.slice(0, 3).toUpperCase()}-N${String(index).padStart(3, "0")}`;

    const product: Product = {
      id,
      companyId: state.companyId,
      name: input.name,
      description: input.description,
      category: input.category,
      collection: input.collection,
      brand: input.brand,
      supplierId: input.supplierId,
      material: input.material,
      cost: input.cost,
      price: input.price,
      promoPrice: input.promoPrice,
      sku,
      barcode: `789${String(900000000 + index * 137).slice(0, 9)}${index % 10}`,
      status: "ativo",
      entryDate: date,
      stockLocation: input.stockLocation,
      minStock: input.minStock,
      demandWeight: 5,
    };

    const variants: ProductVariant[] = [];
    const movements: StockMovement[] = [];
    input.variants.forEach((draft, i) => {
      counters = bumpCounter(counters, "var");
      const variantId = `var_n${String(counters["var"]).padStart(4, "0")}`;
      variants.push({
        id: variantId,
        companyId: state.companyId,
        productId: id,
        color: draft.color,
        size: draft.size,
        sku: `${sku}-${draft.color.slice(0, 2).toUpperCase()}-${draft.size}`,
        barcode: `790${String(900000000 + counters["var"] * 91).slice(0, 9)}${i % 10}`,
        stock: draft.stock,
        minStock: input.minStock,
      });
      if (draft.stock > 0) {
        counters = bumpCounter(counters, "mov");
        movements.push({
          id: `mov_${String(counters["mov"]).padStart(4, "0")}`,
          companyId: state.companyId,
          unitId: state.units[0].id,
          variantId,
          productId: id,
          type: "entrada",
          quantity: draft.stock,
          reason: "Cadastro do produto",
          userId: demoUser.id,
          date,
        });
      }
    });

    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Produto cadastrado",
      "Produto",
      `${input.name} — ${variants.length} ${variants.length === 1 ? "variação" : "variações"}`
    );

    return {
      ...state,
      products: [product, ...state.products],
      variants: [...variants, ...state.variants],
      stockMovements: [...movements, ...state.stockMovements],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });

  return newId;
}

export function updateProduct(productId: string, patch: Partial<Product>): void {
  setState((state) => {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return state;
    const counters = bumpCounter(state.counters, "log");
    const changedPrice =
      patch.price !== undefined && patch.price !== product.price;
    const log = logEntry(
      { ...state, counters },
      changedPrice ? "Alteração de preço" : "Produto atualizado",
      "Produto",
      changedPrice
        ? `${product.name}: R$ ${product.price.toFixed(2)} → R$ ${patch.price!.toFixed(2)}`
        : product.name
    );
    return {
      ...state,
      products: state.products.map((p) =>
        p.id === productId ? { ...p, ...patch } : p
      ),
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export type CreateCustomerInput = Omit<
  Customer,
  "id" | "companyId" | "createdAt"
>;

export function createCustomer(input: CreateCustomerInput): string {
  let newId = "";
  setState((state) => {
    let counters = bumpCounter(state.counters, "cli");
    const id = `cli_n${String(counters["cli"]).padStart(3, "0")}`;
    newId = id;
    const customer: Customer = {
      ...input,
      id,
      companyId: state.companyId,
      createdAt: demoNow(),
    };
    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Cadastro de cliente",
      "Cliente",
      `${input.name} — origem: ${input.origin}`
    );
    return {
      ...state,
      customers: [customer, ...state.customers],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
  return newId;
}

export function updateCustomer(
  customerId: string,
  patch: Partial<Customer>
): void {
  setState((state) => ({
    ...state,
    customers: state.customers.map((c) =>
      c.id === customerId ? { ...c, ...patch } : c
    ),
  }));
}

export function addInteraction(input: {
  customerId: string;
  type: CustomerInteraction["type"];
  note: string;
}): void {
  setState((state) => {
    const counters = bumpCounter(state.counters, "int");
    const interaction: CustomerInteraction = {
      id: `int_${String(counters["int"]).padStart(4, "0")}`,
      companyId: state.companyId,
      customerId: input.customerId,
      type: input.type,
      note: input.note,
      date: demoNow(),
      userName: demoUser.name,
    };
    return {
      ...state,
      interactions: [interaction, ...state.interactions],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export function createExpense(input: {
  category: Expense["category"];
  description: string;
  amount: number;
  isFixed: boolean;
}): void {
  setState((state) => {
    let counters = bumpCounter(state.counters, "desp");
    const expense: Expense = {
      id: `desp_n${String(counters["desp"]).padStart(3, "0")}`,
      companyId: state.companyId,
      category: input.category,
      description: input.description,
      amount: input.amount,
      date: demoNow(),
      isFixed: input.isFixed,
    };
    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Despesa registrada",
      "Financeiro",
      `${input.description} — R$ ${input.amount.toFixed(2)}`
    );
    return {
      ...state,
      expenses: [expense, ...state.expenses],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

export function createPayable(input: {
  description: string;
  supplierName?: string;
  amount: number;
  dueDate: string;
}): void {
  setState((state) => {
    const counters = bumpCounter(state.counters, "pag");
    const payable: Payable = {
      id: `pag_n${String(counters["pag"]).padStart(3, "0")}`,
      companyId: state.companyId,
      description: input.description,
      supplierName: input.supplierName,
      amount: input.amount,
      dueDate: input.dueDate,
      status: "aberto",
    };
    return { ...state, payables: [payable, ...state.payables], counters };
  });
}

/** Baixa uma conta a pagar e lança a despesa correspondente. */
export function payPayable(payableId: string): void {
  setState((state) => {
    const payable = state.payables.find((p) => p.id === payableId);
    if (!payable || payable.status === "pago") return state;

    let counters = bumpCounter(state.counters, "desp");
    const expense: Expense = {
      id: `desp_p${String(counters["desp"]).padStart(3, "0")}`,
      companyId: state.companyId,
      category: payable.supplierName ? "outros" : "outros",
      description: `Pagamento: ${payable.description}`,
      amount: payable.amount,
      date: demoNow(),
      isFixed: false,
    };

    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Conta paga",
      "Financeiro",
      `${payable.description} — R$ ${payable.amount.toFixed(2)}`
    );

    return {
      ...state,
      payables: state.payables.map((p) =>
        p.id === payableId ? { ...p, status: "pago" as const } : p
      ),
      expenses: [expense, ...state.expenses],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

export function receiveReceivable(receivableId: string): void {
  setState((state) => {
    const receivable = state.receivables.find((r) => r.id === receivableId);
    if (!receivable || receivable.status === "recebido") return state;
    const counters = bumpCounter(state.counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Recebimento registrado",
      "Financeiro",
      `${receivable.description} — R$ ${receivable.amount.toFixed(2)}`
    );
    return {
      ...state,
      receivables: state.receivables.map((r) =>
        r.id === receivableId ? { ...r, status: "recebido" as const } : r
      ),
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// Caixa
// ---------------------------------------------------------------------------

export function openCashSession(openingAmount: number): void {
  setState((state) => {
    if (state.cashSessions.some((s) => !s.closedAt)) return state;
    let counters = bumpCounter(state.counters, "cx");
    const id = `cx_${String(counters["cx"]).padStart(3, "0")}`;
    const date = demoNow();
    counters = bumpCounter(counters, "cxm");
    const session: CashSession = {
      id,
      companyId: state.companyId,
      unitId: state.units[0].id,
      openedAt: date,
      openingAmount,
      userName: demoUser.name,
      movements: [
        {
          id: `cxm_${String(counters["cxm"]).padStart(4, "0")}`,
          sessionId: id,
          type: "abertura",
          amount: openingAmount,
          reason: "Fundo de troco",
          date,
          userName: demoUser.name,
        },
      ],
    };
    return { ...state, cashSessions: [session, ...state.cashSessions], counters };
  });
}

export function addCashMovement(input: {
  type: Extract<CashMovementType, "sangria" | "reforco">;
  amount: number;
  reason: string;
}): void {
  setState((state) => {
    const session = state.cashSessions.find((s) => !s.closedAt);
    if (!session) return state;
    const counters = bumpCounter(state.counters, "cxm");
    const movement = {
      id: `cxm_${String(counters["cxm"]).padStart(4, "0")}`,
      sessionId: session.id,
      type: input.type,
      amount: input.type === "sangria" ? -Math.abs(input.amount) : Math.abs(input.amount),
      reason: input.reason,
      date: demoNow(),
      userName: demoUser.name,
    };
    return {
      ...state,
      cashSessions: state.cashSessions.map((s) =>
        s.id === session.id ? { ...s, movements: [...s.movements, movement] } : s
      ),
      counters,
    };
  });
}

export function closeCashSession(countedAmount: number, expected: number): void {
  setState((state) => {
    const session = state.cashSessions.find((s) => !s.closedAt);
    if (!session) return state;
    let counters = bumpCounter(state.counters, "cxm");
    const date = demoNow();
    const closing = {
      id: `cxm_${String(counters["cxm"]).padStart(4, "0")}`,
      sessionId: session.id,
      type: "fechamento" as const,
      amount: countedAmount,
      reason: "Conferência de caixa",
      date,
      userName: demoUser.name,
    };
    counters = bumpCounter(counters, "log");
    const difference = money(countedAmount - expected);
    const log = logEntry(
      { ...state, counters },
      "Caixa fechado",
      "Caixa",
      `Contado R$ ${countedAmount.toFixed(2)} · diferença R$ ${difference.toFixed(2)}`
    );
    return {
      ...state,
      cashSessions: state.cashSessions.map((s) =>
        s.id === session.id
          ? {
              ...s,
              closedAt: date,
              countedAmount,
              difference,
              movements: [...s.movements, closing],
            }
          : s
      ),
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------

export interface CreatePurchaseInput {
  supplierId: string;
  installments: number;
  notes?: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export function createPurchase(input: CreatePurchaseInput): string {
  let newId = "";
  setState((state) => {
    let counters = bumpCounter(state.counters, "com");
    const id = `com_${String(counters["com"]).padStart(3, "0")}`;
    newId = id;
    const total = money(
      input.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0)
    );
    const items: PurchaseItem[] = input.items.map((item, index) => ({
      id: `${id}_i${index + 1}`,
      purchaseId: id,
      ...item,
    }));
    const purchase: Purchase = {
      id,
      companyId: state.companyId,
      code: `PC-${String(counters["com"]).padStart(4, "0")}`,
      supplierId: input.supplierId,
      status: "pedido",
      total,
      installments: input.installments,
      date: demoNow(),
      notes: input.notes,
      items,
    };
    counters = bumpCounter(counters, "log");
    const supplier = state.suppliers.find((s) => s.id === input.supplierId);
    const log = logEntry(
      { ...state, counters },
      "Pedido de compra",
      "Compras",
      `${purchase.code} — ${supplier?.name ?? ""} · R$ ${total.toFixed(2)}`
    );
    return {
      ...state,
      purchases: [purchase, ...state.purchases],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
  return newId;
}

/** Recebe o pedido: entra no estoque e gera as duplicatas a pagar. */
export function receivePurchase(purchaseId: string): void {
  setState((state) => {
    const purchase = state.purchases.find((p) => p.id === purchaseId);
    if (!purchase || purchase.status === "recebido") return state;

    let counters = state.counters;
    const date = demoNow();
    const movements: StockMovement[] = [];

    const variants = state.variants.map((variant) => {
      const item = purchase.items.find((i) => i.variantId === variant.id);
      if (!item) return variant;
      counters = bumpCounter(counters, "mov");
      movements.push({
        id: `mov_${String(counters["mov"]).padStart(4, "0")}`,
        companyId: state.companyId,
        unitId: state.units[0].id,
        variantId: variant.id,
        productId: item.productId,
        type: "entrada",
        quantity: item.quantity,
        reason: `Recebimento do pedido ${purchase.code}`,
        userId: demoUser.id,
        date,
      });
      return { ...variant, stock: variant.stock + item.quantity };
    });

    const supplier = state.suppliers.find((s) => s.id === purchase.supplierId);
    const payables: Payable[] = [];
    const installmentValue = money(purchase.total / purchase.installments);
    for (let n = 1; n <= purchase.installments; n++) {
      counters = bumpCounter(counters, "pag");
      payables.push({
        id: `pag_c${String(counters["pag"]).padStart(3, "0")}`,
        companyId: state.companyId,
        description: `${purchase.code} — parcela ${n}/${purchase.installments}`,
        supplierName: supplier?.name,
        amount: installmentValue,
        dueDate: addDays(new Date(date), n * 30).toISOString(),
        status: "aberto",
      });
    }

    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Compra recebida",
      "Compras",
      `${purchase.code} — estoque atualizado e ${purchase.installments}x no contas a pagar`
    );

    return {
      ...state,
      purchases: state.purchases.map((p) =>
        p.id === purchaseId
          ? { ...p, status: "recebido" as const, receivedAt: date }
          : p
      ),
      variants,
      stockMovements: [...movements, ...state.stockMovements],
      payables: [...payables, ...state.payables],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// CRM, metas, alertas e configurações
// ---------------------------------------------------------------------------

export function createCampaign(input: {
  name: string;
  segment: string;
  channel: Campaign["channel"];
  message: string;
  recipients: number;
}): void {
  setState((state) => {
    let counters = bumpCounter(state.counters, "camp");
    const date = demoNow();
    const campaign: Campaign = {
      id: `camp_${String(counters["camp"]).padStart(3, "0")}`,
      companyId: state.companyId,
      ...input,
      status: "enviada",
      createdAt: date,
      sentAt: date,
    };
    counters = bumpCounter(counters, "log");
    const log = logEntry(
      { ...state, counters },
      "Campanha enviada",
      "CRM",
      `${input.name} — ${input.recipients} clientes via ${input.channel}`
    );
    return {
      ...state,
      campaigns: [campaign, ...state.campaigns],
      activityLog: [log, ...state.activityLog],
      counters,
    };
  });
}

export function setAlertStatus(alertId: string, status: Alert["status"]): void {
  setState((state) => ({
    ...state,
    alertStatus: { ...state.alertStatus, [alertId]: status },
  }));
}

export function updateGoal(month: string, revenueTarget: number): void {
  setState((state) => {
    const existing = state.goals.find((g) => g.month === month);
    const goals = existing
      ? state.goals.map((g) => (g.month === month ? { ...g, revenueTarget } : g))
      : [
          ...state.goals,
          {
            id: `goal_${month}`,
            companyId: state.companyId,
            month,
            revenueTarget,
          },
        ];
    return { ...state, goals };
  });
}

export function updateSellerGoal(sellerId: string, monthlyGoal: number): void {
  setState((state) => ({
    ...state,
    sellers: state.sellers.map((s) =>
      s.id === sellerId ? { ...s, monthlyGoal } : s
    ),
  }));
}

export function updateSettings(patch: Partial<CompanySettings>): void {
  setState((state) => ({
    ...state,
    settings: { ...state.settings, ...patch },
  }));
}

export function updateCompany(patch: Partial<AppState["company"]>): void {
  setState((state) => ({ ...state, company: { ...state.company, ...patch } }));
}
