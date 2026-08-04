/**
 * Ponte para o Supabase.
 *
 * O protótipo roda inteiramente no navegador, com o estado em `src/lib/store`.
 * Este módulo concentra o que muda na virada para produção: com as variáveis de
 * ambiente configuradas, `isSupabaseConfigured()` passa a ser verdadeiro e as
 * ações do store devem ler e gravar por aqui, mantendo a mesma interface para
 * as telas.
 *
 * Passo a passo da migração em docs/PRODUCAO.md.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/**
 * Nomes das tabelas, na mesma ordem em que aparecem nas migrações. Serve de
 * contrato entre o estado local e o banco: cada coleção de `AppState` tem uma
 * tabela correspondente.
 */
export const TABLES = {
  companies: "companies",
  units: "units",
  companyUsers: "company_users",
  companySettings: "company_settings",
  suppliers: "suppliers",
  sellers: "sellers",
  customers: "customers",
  products: "products",
  productVariants: "product_variants",
  sales: "sales",
  saleItems: "sale_items",
  stockMovements: "stock_movements",
  purchases: "purchases",
  purchaseItems: "purchase_items",
  cashSessions: "cash_sessions",
  cashMovements: "cash_movements",
  expenses: "expenses",
  payables: "payables",
  receivables: "receivables",
  goals: "goals",
  campaigns: "campaigns",
  customerInteractions: "customer_interactions",
  alertStates: "alert_states",
  activityLog: "activity_log",
  publicCatalogs: "public_catalogs",
} as const;
