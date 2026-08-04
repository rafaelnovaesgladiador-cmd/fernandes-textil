"use client";

import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { setRouteParams, usePathname } from "./next-shims/navigation";
import { FALLBACK_COMPONENT, matchRoute } from "./routes";

import "./spa.css";

/**
 * Versão SPA do Lume — mesma base de código do app Next, empacotada em um
 * arquivo único para demonstração sem instalação. O roteamento por hash e os
 * grupos de layout reproduzem a estrutura de `src/app`.
 */
function Router() {
  const pathname = usePathname();

  const match = useMemo(() => matchRoute(pathname), [pathname]);

  // Os parâmetros precisam estar disponíveis antes do render da página, já que
  // é durante ele que `useParams()` os consulta.
  setRouteParams(match?.params ?? {});

  if (!match) {
    const Fallback = FALLBACK_COMPONENT;
    return <Fallback />;
  }

  const Page = match.route.component;

  if (match.route.group === "public") {
    return <Page />;
  }

  if (match.route.group === "auth") {
    return (
      <div className="min-h-dvh bg-background">
        <Page />
      </div>
    );
  }

  return (
    <AppShell>
      <Page />
    </AppShell>
  );
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
