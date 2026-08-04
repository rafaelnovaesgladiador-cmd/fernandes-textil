import { demoDay } from "@/lib/dates";
import {
  COMPANY_ID,
  demoActivityLog,
  demoCompany,
  demoCustomers,
  demoExpenses,
  demoGoals,
  demoPayables,
  demoProducts,
  demoReceivables,
  demoSales,
  demoSellers,
  demoSuppliers,
  demoUnits,
  demoVariants,
} from "@/lib/mock";
import type {
  ActivityLog,
  Alert,
  Campaign,
  CashSession,
  Company,
  CompanySettings,
  Customer,
  CustomerInteraction,
  Expense,
  Goal,
  Payable,
  Product,
  ProductVariant,
  Purchase,
  Receivable,
  Sale,
  Seller,
  StockMovement,
  Supplier,
  Unit,
} from "@/lib/types";

/**
 * Estado da aplicação.
 *
 * Cada coleção corresponde a uma tabela do banco na Etapa 5 — a troca dos
 * dados locais pelo Supabase substitui apenas a origem deste objeto, sem
 * alterar as telas que o consomem.
 */
export interface AppState {
  /** Versão do formato; incompatibilidades descartam o estado salvo. */
  version: number;
  companyId: string;
  company: Company;
  units: Unit[];
  settings: CompanySettings;

  products: Product[];
  variants: ProductVariant[];
  stockMovements: StockMovement[];

  customers: Customer[];
  sellers: Seller[];
  suppliers: Supplier[];

  sales: Sale[];
  purchases: Purchase[];
  cashSessions: CashSession[];

  expenses: Expense[];
  payables: Payable[];
  receivables: Receivable[];
  goals: Goal[];

  campaigns: Campaign[];
  interactions: CustomerInteraction[];
  /** Status editado pelo usuário, por id de alerta. */
  alertStatus: Record<string, Alert["status"]>;

  activityLog: ActivityLog[];
  /** Contadores para geração de identificadores legíveis. */
  counters: Record<string, number>;
}

export const STATE_VERSION = 7;

export const DEFAULT_SETTINGS: CompanySettings = {
  companyId: COMPANY_ID,
  cardFeePercent: 3.2,
  taxPercent: 6,
  maxDiscountPercent: 20,
  catalog: {
    headline: "Novidades da coleção",
    description:
      "Peças selecionadas com carinho para você. Fale com a gente pelo WhatsApp e monte seu look.",
    showPrices: true,
    whatsapp: "5519987654321",
    featuredProductIds: [],
  },
  notifications: { stock: true, goal: true, finance: false },
};

/** Estado inicial a partir da base de demonstração. */
export function createSeedState(): AppState {
  const purchases: Purchase[] = [];
  const cashSessions: CashSession[] = [
    {
      id: "cx_001",
      companyId: COMPANY_ID,
      unitId: "unit_main",
      openedAt: demoDay(0, 9).toISOString(),
      openingAmount: 300,
      userName: "Ana Souza",
      movements: [
        {
          id: "cxm_001",
          sessionId: "cx_001",
          type: "abertura",
          amount: 300,
          reason: "Fundo de troco",
          date: demoDay(0, 9).toISOString(),
          userName: "Ana Souza",
        },
      ],
    },
  ];

  return {
    version: STATE_VERSION,
    companyId: COMPANY_ID,
    company: demoCompany,
    units: demoUnits,
    settings: DEFAULT_SETTINGS,

    products: demoProducts,
    variants: demoVariants,
    stockMovements: [],

    customers: demoCustomers,
    sellers: demoSellers,
    suppliers: demoSuppliers,

    sales: demoSales,
    purchases,
    cashSessions,

    expenses: demoExpenses,
    payables: demoPayables,
    receivables: demoReceivables,
    goals: demoGoals,

    campaigns: [],
    interactions: [],
    alertStatus: {},

    activityLog: demoActivityLog,
    counters: {},
  };
}
