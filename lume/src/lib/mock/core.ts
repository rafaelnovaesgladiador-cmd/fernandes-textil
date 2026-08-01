import type {
  Company,
  CompanyUser,
  Goal,
  Seller,
  Supplier,
  Unit,
  User,
} from "@/lib/types";

export const COMPANY_ID = "cmp_bella";

export const demoUser: User = {
  id: "usr_owner",
  name: "Rafael Fernandes",
  email: "demo@lume.app",
  avatarColor: "#8a3163",
};

export const demoCompany: Company = {
  id: COMPANY_ID,
  name: "Bella Moda Feminina LTDA",
  tradeName: "Bella Moda Feminina",
  segment: "Moda feminina",
  cnpj: "12.345.678/0001-90",
  city: "Campinas",
  state: "SP",
  phone: "(19) 98765-4321",
  instagram: "@bellamodafeminina",
  logoInitials: "BM",
  createdAt: "2024-03-12T12:00:00-03:00",
  plan: "gestao",
};

export const demoUnits: Unit[] = [
  {
    id: "unit_main",
    companyId: COMPANY_ID,
    name: "Loja Centro",
    address: "Rua Barão de Jaguara, 1210 — Centro, Campinas/SP",
    isMain: true,
  },
];

export const demoCompanyUsers: CompanyUser[] = [
  {
    id: "cu_owner",
    companyId: COMPANY_ID,
    userId: demoUser.id,
    role: "proprietario",
  },
];

export const demoSellers: Seller[] = [
  {
    id: "sel_ana",
    companyId: COMPANY_ID,
    userId: "usr_ana",
    name: "Ana Souza",
    since: "2024-04-01T12:00:00-03:00",
    commissionRule: {
      type: "por_faixa_de_meta",
      basePercent: 4,
      description: "4% sobre a venda; 5% ao superar a meta mensal",
    },
    monthlyGoal: 20000,
    avatarColor: "#2a78d6",
  },
  {
    id: "sel_juliana",
    companyId: COMPANY_ID,
    userId: "usr_juliana",
    name: "Juliana Prado",
    since: "2024-07-15T12:00:00-03:00",
    commissionRule: {
      type: "percentual_fixo",
      basePercent: 4,
      description: "4% sobre o valor da venda",
    },
    monthlyGoal: 18000,
    avatarColor: "#eb6834",
  },
  {
    id: "sel_camila",
    companyId: COMPANY_ID,
    userId: "usr_camila",
    name: "Camila Ribeiro",
    since: "2025-02-03T12:00:00-03:00",
    commissionRule: {
      type: "percentual_fixo",
      basePercent: 3.5,
      description: "3,5% sobre o valor da venda",
    },
    monthlyGoal: 15000,
    avatarColor: "#1baf7a",
  },
  {
    id: "sel_marina",
    companyId: COMPANY_ID,
    userId: "usr_marina",
    name: "Marina Lopes",
    since: "2025-09-22T12:00:00-03:00",
    commissionRule: {
      type: "percentual_fixo",
      basePercent: 3.5,
      description: "3,5% sobre o valor da venda",
    },
    monthlyGoal: 12000,
    avatarColor: "#e87ba4",
  },
];

export const demoSuppliers: Supplier[] = [
  {
    id: "sup_estilo",
    companyId: COMPANY_ID,
    name: "Estilo Brás Confecções",
    city: "São Paulo",
    state: "SP",
    phone: "(11) 3222-1010",
    categories: ["Vestidos", "Blusas", "Saias"],
  },
  {
    id: "sup_denim",
    companyId: COMPANY_ID,
    name: "Denim House Atacado",
    city: "Goiânia",
    state: "GO",
    phone: "(62) 3644-8890",
    categories: ["Calças", "Shorts", "Camisas"],
  },
  {
    id: "sup_trico",
    companyId: COMPANY_ID,
    name: "Malharia Serra Azul",
    city: "Monte Sião",
    state: "MG",
    phone: "(35) 3465-2211",
    categories: ["Casacos", "Conjuntos", "Blusas"],
  },
  {
    id: "sup_alfaiataria",
    companyId: COMPANY_ID,
    name: "Atelier Vila Nova",
    city: "São Paulo",
    state: "SP",
    phone: "(11) 2601-4477",
    categories: ["Conjuntos", "Macacões", "Camisas"],
  },
  {
    id: "sup_acessorios",
    companyId: COMPANY_ID,
    name: "Mix Acessórios Brasil",
    city: "Limeira",
    state: "SP",
    phone: "(19) 3451-7788",
    categories: ["Acessórios"],
  },
];

export const demoGoals: Goal[] = [
  { id: "goal_2026_03", companyId: COMPANY_ID, month: "2026-03", revenueTarget: 52000 },
  { id: "goal_2026_04", companyId: COMPANY_ID, month: "2026-04", revenueTarget: 55000 },
  { id: "goal_2026_05", companyId: COMPANY_ID, month: "2026-05", revenueTarget: 58000 },
  { id: "goal_2026_06", companyId: COMPANY_ID, month: "2026-06", revenueTarget: 60000 },
  { id: "goal_2026_07", companyId: COMPANY_ID, month: "2026-07", revenueTarget: 64000 },
  { id: "goal_2026_08", companyId: COMPANY_ID, month: "2026-08", revenueTarget: 68000 },
];
