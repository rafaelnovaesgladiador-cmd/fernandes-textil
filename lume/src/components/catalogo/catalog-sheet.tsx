"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorefrontFrame } from "./storefront-frame";

/**
 * Painel deslizante da vitrine.
 *
 * Usa as primitivas do Radix (as mesmas do Sheet do sistema) porque precisa de
 * uma capacidade extra: ancorar-se dentro da moldura de celular na prévia. Na
 * página pública é um modal comum, subindo de baixo — o gesto que a cliente
 * espera no celular.
 */
export function CatalogSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { embedded, layer } = useStorefrontFrame();
  const position = embedded ? "absolute" : "fixed";

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      // Na prévia o painel não pode sequestrar o foco nem travar a rolagem da
      // página de administração ao redor.
      modal={!embedded}
    >
      <DialogPrimitive.Portal container={embedded ? layer : undefined}>
        <DialogPrimitive.Overlay
          className={cn(
            position,
            "pointer-events-auto inset-0 z-50 bg-black/45 backdrop-blur-[1px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            position,
            "pointer-events-auto inset-x-0 bottom-0 z-50 flex max-h-[92%] flex-col",
            "rounded-t-3xl border-t bg-card text-card-foreground shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            "data-[state=open]:duration-300 data-[state=closed]:duration-200",
            !embedded && "mx-auto sm:max-w-lg sm:rounded-b-3xl sm:bottom-4"
          )}
        >
          <div className="relative shrink-0 px-5 pb-2 pt-3">
            <div
              aria-hidden
              className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/25"
            />
            <DialogPrimitive.Title className="mt-3 pr-10 text-lg font-semibold leading-tight tracking-tight">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              className={cn(
                "mt-1 pr-10 text-sm text-muted-foreground",
                !description && "sr-only"
              )}
            >
              {description ?? title}
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute right-4 top-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
