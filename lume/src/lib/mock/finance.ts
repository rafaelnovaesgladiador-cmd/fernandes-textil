import { createRng } from "@/lib/rng";
import { addDays, DEMO_TODAY, demoDay, monthKey } from "@/lib/dates";
import type { Expense, Payable, Receivable } from "@/lib/types";
import { COMPANY_ID, demoSuppliers } from "./core";
import { demoCustomers } from "./customers";
import { demoSales } from "./sales";

/**
 * Financeiro derivado das vendas geradas: impostos e taxas de cartão são
 * calculados sobre o faturamento real de cada mês, e as contas a receber
 * nascem das vendas em crediário — mantendo Dashboard, vendas e financeiro
 * contando a mesma história.
 */

const CARD_FEE_RATE = 0.032;
const TAX_RATE = 0.06;

interface MonthTotals {
  revenue: number;
  cardRevenue: number;
}

function computeMonthTotals(): Map<string, MonthTotals> {
  const totals = new Map<string, MonthTotals>();
  for (const sale of demoSales) {
    if (sale.status === "cancelada" || sale.status === "devolvida") continue;
    const key = monthKey(sale.date);
    const entry = totals.get(key) ?? { revenue: 0, cardRevenue: 0 };
    entry.revenue += sale.total;
    if (sale.paymentMethod === "credito" || sale.paymentMethod === "debito") {
      entry.cardRevenue += sale.total;
    }
    totals.set(key, entry);
  }
  return totals;
}

function buildExpenses(): Expense[] {
  const rng = createRng(33082026);
  const expenses: Expense[] = [];
  const monthTotals = computeMonthTotals();
  let index = 0;

  const push = (
    category: Expense["category"],
    description: string,
    amount: number,
    date: Date,
    isFixed: boolean
  ) => {
    index += 1;
    expenses.push({
      id: `desp_${String(index).padStart(3, "0")}`,
      companyId: COMPANY_ID,
      category,
      description,
      amount: Math.round(amount * 100) / 100,
      date: date.toISOString(),
      isFixed,
    });
  };

  // Meses do histórico: fev/2026 (parcial) até ago/2026.
  const months = [...monthTotals.keys()].sort();

  for (const key of months) {
    const [year, month] = key.split("-").map(Number);
    const monthStart = new Date(`${key}-01T12:00:00-03:00`);
    const isCurrentMonth = key === monthKey(DEMO_TODAY);
    const totals = monthTotals.get(key)!;

    push("aluguel", "Aluguel do ponto — Loja Centro", 4200, addDays(monthStart, 4), true);
    push("salarios", "Folha de pagamento (4 vendedoras + encargos)", 9400 + rng.int(-150, 350), addDays(monthStart, 4), true);
    push("energia", "Conta de energia elétrica", rng.float(360, 540), addDays(monthStart, 9), true);
    push("internet", "Internet fibra + telefonia", 199.9, addDays(monthStart, 9), true);
    push("contabilidade", "Honorários contábeis", 480, addDays(monthStart, 11), true);
    push("embalagens", "Sacolas, caixas e tags", rng.float(240, 430), addDays(monthStart, rng.int(6, 18)), false);

    // Marketing cresce nos meses recentes (campanhas de inverno).
    const monthIndex = months.indexOf(key);
    const marketingBase = 550 + monthIndex * 130;
    push("marketing", "Tráfego pago + impulsionamentos Instagram", marketingBase + rng.float(-80, 160), addDays(monthStart, rng.int(8, 16)), false);
    if (key === "2026-07") {
      push("marketing", "Parceria com influenciadora — campanha de inverno", 1450, addDays(monthStart, 14), false);
    }

    if (rng.chance(0.4)) {
      push("manutencao", rng.pick(["Manutenção do ar-condicionado", "Reparo na iluminação da vitrine", "Manutenção da máquina de etiquetas"]), rng.float(180, 520), addDays(monthStart, rng.int(10, 24)), false);
    }

    // Derivados das vendas do mês (proporcionais ao dia atual no mês corrente).
    push("taxas_cartao", "Taxas de cartão (crédito/débito)", totals.cardRevenue * CARD_FEE_RATE, addDays(monthStart, isCurrentMonth ? 0 : 27), false);
    push("impostos", "Simples Nacional (DAS)", totals.revenue * TAX_RATE, addDays(monthStart, isCurrentMonth ? 0 : 19), true);

    void year;
    void month;
  }

  return expenses;
}

function buildReceivables(): Receivable[] {
  const receivables: Receivable[] = [];
  let index = 0;

  // Parcelas de crediário das vendas dos últimos ~75 dias.
  const crediarioSales = demoSales.filter(
    (sale) =>
      sale.paymentMethod === "crediario" &&
      sale.status === "finalizada" &&
      new Date(sale.date).getTime() >= demoDay(-75).getTime()
  );

  for (const sale of crediarioSales) {
    const customer = demoCustomers.find((c) => c.id === sale.customerId);
    const installmentValue = Math.round((sale.total / sale.installments) * 100) / 100;
    for (let n = 1; n <= sale.installments; n++) {
      const dueDate = addDays(new Date(sale.date), n * 30);
      if (dueDate.getTime() < demoDay(-40).getTime()) continue;
      index += 1;
      const isPast = dueDate.getTime() < DEMO_TODAY.getTime();
      receivables.push({
        id: `rec_${String(index).padStart(3, "0")}`,
        companyId: COMPANY_ID,
        saleId: sale.id,
        customerId: sale.customerId,
        description: `Crediário ${sale.code} — parcela ${n}/${sale.installments}${customer ? ` · ${customer.name}` : ""}`,
        amount: installmentValue,
        dueDate: dueDate.toISOString(),
        // Parcelas vencidas: ~25% seguem em aberto (inadimplência da demo).
        status: isPast ? (index % 4 === 0 ? "vencido" : "recebido") : "aberto",
      });
    }
  }

  return receivables;
}

function buildPayables(): Payable[] {
  const rng = createRng(55082026);
  const payables: Payable[] = [];
  let index = 0;

  const push = (
    description: string,
    supplierName: string | undefined,
    amount: number,
    dueOffset: number,
    status: Payable["status"]
  ) => {
    index += 1;
    payables.push({
      id: `pag_${String(index).padStart(3, "0")}`,
      companyId: COMPANY_ID,
      description,
      supplierName,
      amount: Math.round(amount * 100) / 100,
      dueDate: demoDay(dueOffset, 12).toISOString(),
      status,
    });
  };

  // Duplicatas de fornecedores (compras da coleção de inverno).
  push("Duplicata 2/3 — pedido coleção Inverno", demoSuppliers[2].name, 3840, 6, "aberto");
  push("Duplicata 3/3 — pedido coleção Inverno", demoSuppliers[2].name, 3840, 36, "aberto");
  push("Pedido reposição jeans — NF 8214", demoSuppliers[1].name, 2760, 12, "aberto");
  push("Pedido acessórios — NF 1099", demoSuppliers[4].name, 980, 18, "aberto");
  push("Duplicata 1/2 — alfaiataria primavera", demoSuppliers[3].name, 2450, 24, "aberto");
  push("Duplicata vencida — pedido vestidos NF 7730", demoSuppliers[0].name, 1890, -4, "vencido");

  // Despesas recorrentes do próximo ciclo.
  push("Aluguel de agosto — Loja Centro", undefined, 4200, 4, "aberto");
  push("DAS — competência julho", undefined, 3620, 19, "aberto");
  push("Energia elétrica — julho", undefined, rng.float(380, 520), 9, "aberto");

  return payables;
}

export const demoExpenses: Expense[] = buildExpenses();
export const demoReceivables: Receivable[] = buildReceivables();
export const demoPayables: Payable[] = buildPayables();
