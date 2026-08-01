import {
  Bell,
  BookOpen,
  Calculator,
  ChartColumn,
  LayoutDashboard,
  Package,
  Settings,
  Shirt,
  ShoppingBag,
  Truck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Etapa do roadmap em que o módulo fica completo (1 = já nesta entrega). */
  stage: 1 | 2 | 3 | 4;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Visão geral", href: "/visao-geral", icon: LayoutDashboard, stage: 1 },
      { label: "Vendas", href: "/vendas", icon: ShoppingBag, stage: 2 },
      { label: "Caixa", href: "/caixa", icon: Calculator, stage: 3 },
    ],
  },
  {
    label: "Operação",
    items: [
      { label: "Produtos", href: "/produtos", icon: Shirt, stage: 2 },
      { label: "Estoque", href: "/estoque", icon: Package, stage: 2 },
      { label: "Compras", href: "/compras", icon: Truck, stage: 3 },
    ],
  },
  {
    label: "Relacionamento",
    items: [
      { label: "Clientes", href: "/clientes", icon: Users, stage: 2 },
      { label: "Vendedores", href: "/vendedores", icon: UsersRound, stage: 2 },
      { label: "Catálogo", href: "/catalogo", icon: BookOpen, stage: 4 },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Financeiro", href: "/financeiro", icon: Wallet, stage: 3 },
      { label: "Relatórios", href: "/relatorios", icon: ChartColumn, stage: 3 },
      { label: "Alertas", href: "/alertas", icon: Bell, stage: 1 },
    ],
  },
  {
    items: [
      { label: "Configurações", href: "/configuracoes", icon: Settings, stage: 1 },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Itens fixos da barra inferior no celular. */
export const MOBILE_TABS = ["/visao-geral", "/vendas", "/produtos"] as const;
