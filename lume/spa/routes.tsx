"use client";

import type { ComponentType } from "react";

import RootRedirect from "@/app/page";
import LoginPage from "@/app/(auth)/login/page";
import OnboardingPage from "@/app/(auth)/onboarding/page";
import SelectCompanyPage from "@/app/(auth)/selecionar-empresa/page";

import DashboardPage from "@/app/(app)/visao-geral/page";
import VendasPage from "@/app/(app)/vendas/page";
import NovaVendaPage from "@/app/(app)/vendas/nova/page";
import VendaDetalhePage from "@/app/(app)/vendas/[id]/page";
import CaixaPage from "@/app/(app)/caixa/page";
import ProdutosPage from "@/app/(app)/produtos/page";
import NovoProdutoPage from "@/app/(app)/produtos/novo/page";
import ProdutoDetalhePage from "@/app/(app)/produtos/[id]/page";
import EstoquePage from "@/app/(app)/estoque/page";
import ComprasPage from "@/app/(app)/compras/page";
import NovaCompraPage from "@/app/(app)/compras/nova/page";
import ClientesPage from "@/app/(app)/clientes/page";
import NovoClientePage from "@/app/(app)/clientes/novo/page";
import ClienteDetalhePage from "@/app/(app)/clientes/[id]/page";
import VendedoresPage from "@/app/(app)/vendedores/page";
import FinanceiroPage from "@/app/(app)/financeiro/page";
import CatalogoPage from "@/app/(app)/catalogo/page";
import RelatoriosPage from "@/app/(app)/relatorios/page";
import AlertasPage from "@/app/(app)/alertas/page";
import ConfiguracoesPage from "@/app/(app)/configuracoes/page";

import VitrinePage from "@/app/(public)/vitrine/page";

/**
 * Tabela de rotas da versão SPA.
 *
 * Espelha a estrutura de `src/app`: o grupo define qual moldura envolve a
 * página (autenticação, sistema ou vitrine pública), e `:param` reproduz os
 * segmentos dinâmicos do App Router.
 */
export type RouteGroup = "auth" | "app" | "public";

export interface RouteDefinition {
  path: string;
  group: RouteGroup;
  component: ComponentType;
}

export const ROUTES: RouteDefinition[] = [
  { path: "/login", group: "auth", component: LoginPage },
  { path: "/onboarding", group: "auth", component: OnboardingPage },
  { path: "/selecionar-empresa", group: "auth", component: SelectCompanyPage },

  { path: "/visao-geral", group: "app", component: DashboardPage },
  { path: "/vendas", group: "app", component: VendasPage },
  { path: "/vendas/nova", group: "app", component: NovaVendaPage },
  { path: "/vendas/:id", group: "app", component: VendaDetalhePage },
  { path: "/caixa", group: "app", component: CaixaPage },
  { path: "/produtos", group: "app", component: ProdutosPage },
  { path: "/produtos/novo", group: "app", component: NovoProdutoPage },
  { path: "/produtos/:id", group: "app", component: ProdutoDetalhePage },
  { path: "/estoque", group: "app", component: EstoquePage },
  { path: "/compras", group: "app", component: ComprasPage },
  { path: "/compras/nova", group: "app", component: NovaCompraPage },
  { path: "/clientes", group: "app", component: ClientesPage },
  { path: "/clientes/novo", group: "app", component: NovoClientePage },
  { path: "/clientes/:id", group: "app", component: ClienteDetalhePage },
  { path: "/vendedores", group: "app", component: VendedoresPage },
  { path: "/financeiro", group: "app", component: FinanceiroPage },
  { path: "/catalogo", group: "app", component: CatalogoPage },
  { path: "/relatorios", group: "app", component: RelatoriosPage },
  { path: "/alertas", group: "app", component: AlertasPage },
  { path: "/configuracoes", group: "app", component: ConfiguracoesPage },

  { path: "/vitrine", group: "public", component: VitrinePage },
];

export const FALLBACK_COMPONENT = RootRedirect;

export interface RouteMatch {
  route: RouteDefinition;
  params: Record<string, string>;
}

/** Casa o caminho com a tabela; rotas fixas têm prioridade sobre as dinâmicas. */
export function matchRoute(pathname: string): RouteMatch | null {
  const parts = pathname.split("/").filter(Boolean);

  const candidates = [...ROUTES].sort((a, b) => {
    const aDynamic = a.path.includes(":") ? 1 : 0;
    const bDynamic = b.path.includes(":") ? 1 : 0;
    return aDynamic - bDynamic;
  });

  for (const route of candidates) {
    const routeParts = route.path.split("/").filter(Boolean);
    if (routeParts.length !== parts.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < routeParts.length; i++) {
      const segment = routeParts[i];
      if (segment.startsWith(":")) {
        params[segment.slice(1)] = decodeURIComponent(parts[i]);
      } else if (segment !== parts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }

  return null;
}
