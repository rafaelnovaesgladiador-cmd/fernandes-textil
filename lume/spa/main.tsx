"use client";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { usePathname } from "./next-shims/navigation";

import RootRedirect from "@/app/page";
import LoginPage from "@/app/(auth)/login/page";
import OnboardingPage from "@/app/(auth)/onboarding/page";
import SelectCompanyPage from "@/app/(auth)/selecionar-empresa/page";

import DashboardPage from "@/app/(app)/visao-geral/page";
import VendasPage from "@/app/(app)/vendas/page";
import CaixaPage from "@/app/(app)/caixa/page";
import ProdutosPage from "@/app/(app)/produtos/page";
import EstoquePage from "@/app/(app)/estoque/page";
import ComprasPage from "@/app/(app)/compras/page";
import ClientesPage from "@/app/(app)/clientes/page";
import VendedoresPage from "@/app/(app)/vendedores/page";
import FinanceiroPage from "@/app/(app)/financeiro/page";
import CatalogoPage from "@/app/(app)/catalogo/page";
import RelatoriosPage from "@/app/(app)/relatorios/page";
import AlertasPage from "@/app/(app)/alertas/page";
import ConfiguracoesPage from "@/app/(app)/configuracoes/page";

import "./spa.css";

/**
 * Versão SPA do Lume — mesma base de código do app Next, empacotada em um
 * arquivo único para demonstração sem instalação. O roteamento por hash e os
 * grupos de layout reproduzem a estrutura de `src/app`.
 */

/** Rotas do grupo (auth): sem o shell administrativo. */
const AUTH_ROUTES: Record<string, React.ComponentType> = {
  "/login": LoginPage,
  "/onboarding": OnboardingPage,
  "/selecionar-empresa": SelectCompanyPage,
};

/** Rotas do grupo (app): renderizadas dentro do AppShell. */
const APP_ROUTES: Record<string, React.ComponentType> = {
  "/visao-geral": DashboardPage,
  "/vendas": VendasPage,
  "/caixa": CaixaPage,
  "/produtos": ProdutosPage,
  "/estoque": EstoquePage,
  "/compras": ComprasPage,
  "/clientes": ClientesPage,
  "/vendedores": VendedoresPage,
  "/financeiro": FinanceiroPage,
  "/catalogo": CatalogoPage,
  "/relatorios": RelatoriosPage,
  "/alertas": AlertasPage,
  "/configuracoes": ConfiguracoesPage,
};

function Router() {
  const pathname = usePathname();

  const AuthPage = AUTH_ROUTES[pathname];
  if (AuthPage) {
    return (
      <div className="min-h-dvh bg-background">
        <AuthPage />
      </div>
    );
  }

  const AppPage = APP_ROUTES[pathname];
  if (AppPage) {
    return (
      <AppShell>
        <AppPage />
      </AppShell>
    );
  }

  // Raiz e rotas desconhecidas caem no redirecionador por estado de sessão.
  return <RootRedirect />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <Router />
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  </StrictMode>
);
