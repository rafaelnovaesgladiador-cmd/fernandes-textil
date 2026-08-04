"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Contexto que permite renderizar a MESMA vitrine em dois lugares:
 * na página pública (ocupando a tela) e dentro da moldura de celular da prévia.
 *
 * Camadas flutuantes (botão da lista, painéis) precisam saber onde se ancorar:
 * na janela, quando a vitrine é a página; dentro da moldura, na prévia.
 */

export interface StorefrontFrame {
  embedded: boolean;
  /** Camada de sobreposição da moldura; null quando a vitrine é a página. */
  layer: Element | null;
}

const FrameContext = React.createContext<StorefrontFrame>({
  embedded: false,
  layer: null,
});

export function useStorefrontFrame(): StorefrontFrame {
  return React.useContext(FrameContext);
}

/** `fixed` na página, `absolute` dentro da moldura. */
export function useOverlayPosition(): string {
  return useStorefrontFrame().embedded ? "absolute" : "fixed";
}

/** Envia o conteúdo para a camada da moldura quando existir. */
export function FrameLayer({ children }: { children: React.ReactNode }) {
  const { embedded, layer } = useStorefrontFrame();
  if (embedded && layer) return createPortal(children, layer);
  return <>{children}</>;
}

/**
 * Moldura de celular da prévia: área rolável própria e uma camada de
 * sobreposição irmã, para que o botão flutuante e os painéis fiquem colados na
 * moldura em vez de rolarem junto com o conteúdo.
 */
export function PhoneFrame({
  children,
  className,
  height = 700,
}: {
  children: React.ReactNode;
  className?: string;
  height?: number;
}) {
  const [layer, setLayer] = React.useState<HTMLDivElement | null>(null);
  const value = React.useMemo<StorefrontFrame>(
    () => ({ embedded: true, layer }),
    [layer]
  );

  return (
    <div className={cn("mx-auto w-full max-w-[390px]", className)}>
      <div className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-[#1b1613] bg-background shadow-2xl dark:border-[#3a3438]">
        <div
          aria-hidden
          className="absolute left-1/2 top-0 z-40 h-5 w-28 -translate-x-1/2 rounded-b-xl bg-[#1b1613] dark:bg-[#3a3438]"
        />
        <div
          className="relative overflow-y-auto overscroll-contain"
          style={{ height: `${height}px` }}
        >
          <FrameContext.Provider value={value}>{children}</FrameContext.Provider>
        </div>
        <div
          ref={setLayer}
          className="pointer-events-none absolute inset-0 z-50"
        />
      </div>
    </div>
  );
}
