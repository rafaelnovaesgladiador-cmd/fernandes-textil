"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { createLocalStore } from "@/lib/client-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileTabbar } from "./mobile-tabbar";

const collapseStore = createLocalStore(
  "lume.sidebar.collapsed",
  (raw) => raw === "1",
  false
);

/** Shell autenticado: sidebar + topbar + conteúdo + barra inferior mobile. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, ready } = useSession();
  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    collapseStore.getSnapshot,
    collapseStore.getServerSnapshot
  );

  // Guarda de rota simulada: sem login → /login; sem loja → seleção.
  useEffect(() => {
    if (!ready) return;
    if (!session.loggedIn) {
      router.replace("/login");
    } else if (!session.companyId) {
      router.replace("/selecionar-empresa");
    }
  }, [ready, session, router]);

  const toggle = () => {
    collapseStore.write(collapsed ? "0" : "1");
  };

  if (!ready || !session.loggedIn || !session.companyId) {
    return (
      <div className="flex min-h-dvh">
        <div className="hidden w-60 shrink-0 bg-sidebar lg:block" />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
            {children}
          </main>
        </div>
        <MobileTabbar />
      </div>
    </TooltipProvider>
  );
}
