"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ALL_NAV_ITEMS, MOBILE_TABS, NAV_GROUPS } from "@/lib/nav";
import { useComingSoon } from "@/components/coming-soon";
import { demoCompany } from "@/lib/mock";
import { cn } from "@/lib/utils";

/**
 * Navegação de celular: barra inferior com as áreas principais,
 * botão central de ação rápida (Nova venda) e menu completo em gaveta.
 */
export function MobileTabbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const comingSoon = useComingSoon();

  const tabs = MOBILE_TABS.map(
    (href) => ALL_NAV_ITEMS.find((item) => item.href === href)!
  );
  const [first, second, third] = tabs;

  const tabClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
    );

  const renderTab = (item: (typeof tabs)[number]) => {
    const active = pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={tabClass(active)}
      >
        <item.icon className="size-5" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch gap-1 px-2">
          {renderTab(first)}
          {renderTab(second)}

          <div className="flex flex-1 items-center justify-center">
            <button
              aria-label="Nova venda"
              onClick={() =>
                comingSoon.show(
                  "Nova venda",
                  2,
                  "O fluxo completo de venda — pensado para o balcão e para o WhatsApp — é o coração da Etapa 2."
                )
              }
              className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
            >
              <Plus className="size-6" />
            </button>
          </div>

          {renderTab(third)}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className={tabClass(false)} aria-label="Abrir menu completo">
                <Menu className="size-5" />
                <span>Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)]">
              <SheetHeader className="pb-0">
                <SheetTitle>{demoCompany.tradeName}</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-2 px-4 pb-2">
                {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        active
                          ? "border-primary/40 bg-accent text-accent-foreground"
                          : "hover:bg-secondary"
                      )}
                    >
                      <item.icon className="size-5" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      {comingSoon.dialog}
    </>
  );
}
