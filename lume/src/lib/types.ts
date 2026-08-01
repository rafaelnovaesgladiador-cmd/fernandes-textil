/**
 * Modelo de domínio do Lume — SaaS multiempresa de gestão para lojas de moda.
 *
 * Toda entidade que pertence a uma loja carrega `companyId`: é a chave de
 * isolamento entre empresas. Quando os mocks forem substituídos pelo Supabase,
 * essas interfaces mapeiam 1:1 para tabelas com RLS por `company_id`.
 */

export type Role =
  | "proprietario"
  | "gerente"
  | "vendedor"
  | "caixa"
  | "estoquista"
  | "financeiro";

export const ROLE_LABELS: Record<Role, string> = {
  proprietario: "Proprietário",
  gerente: "Gerente",
  vendedor: "Vendedor",
  caixa: "Operador de caixa",
  estoquista: "Estoquista",
  financeiro: "Financeiro",
};

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface Company {
  id: string;
  name: string;
  tradeName: string;
  segment: string;
  cnpj?: string;
  city: string;
  state: string;
  phone: string;
  instagram?: string;
  logoInitials: string;
  createdAt: string;
  plan: "essencial" | "gestao" | "pro";
}

export interface Unit {
  id: string;
  companyId: string;
  name: string;
  address: string;
  isMain: boolean;
}

export interface CompanyUser {
  id: string;
  companyId: string;
  userId: string;
  role: Role;
}

export type SalesChannel = "loja" | "whatsapp" | "instagram";

export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  loja: "Loja física",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

export type PaymentMethod =
  | "pix"
  | "credito"
  | "debito"
  | "dinheiro"
  | "crediario";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  dinheiro: "Dinheiro",
  crediario: "Crediário",
};

export type ProductSize = "P" | "M" | "G" | "GG" | "U";

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  collection: string;
  brand: string;
  supplierId: string;
  material: string;
  cost: number;
  price: number;
  promoPrice?: number;
  sku: string;
  barcode: string;
  status: "ativo" | "inativo";
  entryDate: string;
  stockLocation: string;
  minStock: number;
  /** Peso de giro usado pelo gerador de vendas (1 = baixo, 10 = altíssimo). */
  demandWeight: number;
}

export interface ProductVariant {
  id: string;
  companyId: string;
  productId: string;
  color: string;
  size: ProductSize;
  sku: string;
  barcode: string;
  stock: number;
  minStock: number;
}

export type StockMovementType =
  | "entrada"
  | "saida"
  | "ajuste"
  | "perda"
  | "avaria"
  | "devolucao"
  | "troca"
  | "transferencia"
  | "inventario";

export interface StockMovement {
  id: string;
  companyId: string;
  unitId: string;
  variantId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  userId: string;
  date: string;
}

export type SaleStatus =
  | "em_andamento"
  | "finalizada"
  | "cancelada"
  | "trocada"
  | "devolvida"
  | "parcialmente_devolvida";

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
  trocada: "Trocada",
  devolvida: "Devolvida",
  parcialmente_devolvida: "Parcialmente devolvida",
};

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
}

export interface Sale {
  id: string;
  companyId: string;
  unitId: string;
  code: string;
  customerId?: string;
  sellerId: string;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  installments: number;
  status: SaleStatus;
  discount: number;
  /** Valor final cobrado (itens - descontos). */
  total: number;
  /** Custo das mercadorias vendidas. */
  totalCost: number;
  date: string;
  items: SaleItem[];
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  birthday?: string;
  city: string;
  instagram?: string;
  preferredSize: ProductSize;
  preferences: string[];
  notes?: string;
  sellerId?: string;
  origin: "loja" | "instagram" | "whatsapp" | "indicacao";
  createdAt: string;
  marketingConsent: boolean;
}

export interface Seller {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  since: string;
  commissionRule: CommissionRule;
  monthlyGoal: number;
  avatarColor: string;
}

export interface CommissionRule {
  type: "percentual_fixo" | "por_categoria" | "por_faixa_de_meta";
  basePercent: number;
  description: string;
}

export type ExpenseCategory =
  | "aluguel"
  | "salarios"
  | "energia"
  | "internet"
  | "marketing"
  | "embalagens"
  | "contabilidade"
  | "taxas_cartao"
  | "impostos"
  | "manutencao"
  | "outros";

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  aluguel: "Aluguel",
  salarios: "Salários",
  energia: "Energia elétrica",
  internet: "Internet e telefone",
  marketing: "Marketing",
  embalagens: "Embalagens",
  contabilidade: "Contabilidade",
  taxas_cartao: "Taxas de cartão",
  impostos: "Impostos",
  manutencao: "Manutenção",
  outros: "Outros",
};

export interface Expense {
  id: string;
  companyId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  isFixed: boolean;
}

export interface Payable {
  id: string;
  companyId: string;
  description: string;
  supplierName?: string;
  amount: number;
  dueDate: string;
  status: "aberto" | "pago" | "vencido";
}

export interface Receivable {
  id: string;
  companyId: string;
  saleId?: string;
  customerId?: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "aberto" | "recebido" | "vencido";
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  categories: string[];
}

export interface Goal {
  id: string;
  companyId: string;
  /** "2026-08" */
  month: string;
  revenueTarget: number;
}

export type AlertCategory =
  | "financeiro"
  | "vendas"
  | "estoque"
  | "clientes"
  | "vendedores"
  | "metas"
  | "operacao";

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  financeiro: "Financeiro",
  vendas: "Vendas",
  estoque: "Estoque",
  clientes: "Clientes",
  vendedores: "Vendedores",
  metas: "Metas",
  operacao: "Operação",
};

export type AlertPriority = "baixa" | "media" | "alta" | "critica";

export const ALERT_PRIORITY_LABELS: Record<AlertPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export interface Alert {
  id: string;
  companyId: string;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  explanation: string;
  estimatedImpact?: number;
  recommendation: string;
  actionLabel: string;
  actionHref: string;
  date: string;
  status: "aberto" | "resolvido" | "ignorado";
}

export interface ActivityLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  detail: string;
  date: string;
}
