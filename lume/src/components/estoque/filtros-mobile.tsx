"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Filtros do celular: no desktop os controles ficam na barra; no celular eles
 * moram em uma gaveta, para não roubar a tela da lista.
 */
export function FiltrosMobile({
  activeCount,
  description,
  onClear,
  children,
}: {
  activeCount: number;
  description: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="shrink-0 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir filtros"
      >
        <SlidersHorizontal />
        Filtros
        {activeCount > 0 ? (
          <Badge variant="accent" className="ml-0.5">
            {activeCount}
          </Badge>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4">{children}</div>
          <div className="flex gap-2 px-4 pb-6">
            {onClear ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Limpar
              </Button>
            ) : null}
            <SheetClose asChild>
              <Button className="flex-1">Ver resultados</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
