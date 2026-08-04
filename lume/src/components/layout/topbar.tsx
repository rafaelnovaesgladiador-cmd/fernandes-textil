"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { NotificationsMenu } from "./notifications-menu";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { SearchDialog } from "./search-dialog";

export function Topbar() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  // Atalho de teclado "/" abre a busca global.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="lg:hidden">
        <Brand size="sm" />
      </div>

      <button
        onClick={() => setSearchOpen(true)}
        className="ml-auto hidden h-9 w-64 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-secondary sm:flex outline-none focus-visible:ring-2 focus-visible:ring-ring/30 cursor-pointer"
        aria-label="Abrir busca"
      >
        <Search className="size-4" />
        Buscar produto ou cliente…
        <kbd className="ml-auto rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
          /
        </kbd>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto sm:ml-0 sm:hidden"
        aria-label="Abrir busca"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="size-4.5" />
      </Button>

      <Button
        className="hidden sm:inline-flex"
        onClick={() => router.push("/vendas/nova")}
      >
        <Plus /> Nova venda
      </Button>

      <NotificationsMenu />
      <ThemeToggle />
      <UserMenu />

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
