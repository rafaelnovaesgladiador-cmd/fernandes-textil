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
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permissão exigida para ver o item no menu. */
  permission: Permission;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        label: "Visão geral",
        href: "/visao-geral",
        icon: LayoutDashboard,
        permission: "dashboard.ver",
      },
      { label: "Vendas", href: "/vendas", icon: ShoppingBag, permission: "vendas.ver" },
      { label: "Caixa", href: "/caixa", icon: Calculator, permission: "caixa.operar" },
    ],
  },
  {
    label: "Operação",
    items: [
      { label: "Produtos", href: "/produtos", icon: Shirt, permission: "produtos.ver" },
      { label: "Estoque", href: "/estoque", icon: Package, permission: "estoque.ver" },
      { label: "Compras", href: "/compras", icon: Truck, permission: "compras.ver" },
    ],
  },
  {
    label: "Relacionamento",
    items: [
      { label: "Clientes", href: "/clientes", icon: Users, permission: "clientes.ver" },
      {
        label: "Vendedores",
        href: "/vendedores",
        icon: UsersRound,
        permission: "vendedores.ver",
      },
      {
        label: "Catálogo",
        href: "/catalogo",
        icon: BookOpen,
        permission: "catalogo.gerenciar",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        label: "Financeiro",
        href: "/financeiro",
        icon: Wallet,
        permission: "financeiro.ver",
      },
      {
        label: "Relatórios",
        href: "/relatorios",
        icon: ChartColumn,
        permission: "relatorios.ver",
      },
      { label: "Alertas", href: "/alertas", icon: Bell, permission: "alertas.ver" },
    ],
  },
  {
    items: [
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: Settings,
        permission: "configuracoes.ver",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Itens fixos da barra inferior no celular. */
export const MOBILE_TABS = ["/visao-geral", "/vendas", "/produtos"] as const;
