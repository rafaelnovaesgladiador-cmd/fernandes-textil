"use client";

import * as React from "react";
import { Copy, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CatalogSheet } from "./catalog-sheet";
import { ColorSwatch, ProductMedia } from "./product-media";
import {
  buildOrderMessage,
  copyToClipboard,
  openWhatsapp,
} from "./share";
import { FrameLayer, useStorefrontFrame } from "./storefront-frame";
import { useWishlist } from "./wishlist";

/**
 * Lista de interesse: botão flutuante com contador e o painel do pedido.
 *
 * O botão só aparece quando há peças — antes disso ele seria só ruído sobre a
 * vitrine.
 */
export function InterestList({
  showPrices,
  storeName,
  whatsapp,
  catalogUrl,
}: {
  showPrices: boolean;
  storeName: string;
  whatsapp: string;
  catalogUrl?: string;
}) {
  const { embedded } = useStorefrontFrame();
  const wishlist = useWishlist();
  const [open, setOpen] = React.useState(false);

  const hasItems = wishlist.items.length > 0;
  const hasWhatsapp = whatsapp.trim() !== "";

  const message = buildOrderMessage({
    storeName,
    items: wishlist.items,
    showPrices,
    catalogUrl,
  });

  const handleSend = () => {
    if (!hasItems || !hasWhatsapp) return;
    openWhatsapp(whatsapp, message);
    toast.success("Abrindo o WhatsApp com seu pedido");
  };

  const handleCopy = async () => {
    const copied = await copyToClipboard(message);
    if (copied) toast.success("Mensagem copiada — é só colar no WhatsApp");
    else toast.error("Não foi possível copiar a mensagem");
  };

  return (
    <>
      {hasItems ? (
        <FrameLayer>
          <div
            className={cn(
              embedded ? "absolute" : "fixed",
              "pointer-events-none bottom-4 right-4 z-40 sm:bottom-6 sm:right-6"
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`Abrir minha lista com ${wishlist.count} ${
                wishlist.count === 1 ? "peça" : "peças"
              }`}
              className={cn(
                "pointer-events-auto inline-flex h-14 cursor-pointer items-center gap-2.5 rounded-full bg-primary pl-5 pr-4 text-primary-foreground shadow-lg",
                "transition-transform hover:scale-[1.03] active:scale-[0.98]",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              <ShoppingBag className="size-5" />
              <span className="text-sm font-semibold">Minha lista</span>
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-bold tabular-nums">
                {wishlist.count}
              </span>
            </button>
          </div>
        </FrameLayer>
      ) : null}

      <CatalogSheet
        open={open && hasItems}
        onOpenChange={setOpen}
        title="Minha lista"
        description={
          showPrices
            ? `${wishlist.count} ${wishlist.count === 1 ? "peça" : "peças"} · ${formatBRL(wishlist.total)}`
            : `${wishlist.count} ${wishlist.count === 1 ? "peça selecionada" : "peças selecionadas"}`
        }
        footer={
          <div className="space-y-2">
            <Button
              size="lg"
              className="h-12 w-full"
              onClick={handleSend}
              disabled={!hasWhatsapp}
            >
              <ShoppingBag /> Enviar pedido no WhatsApp
            </Button>
            {hasWhatsapp ? null : (
              <p className="text-center text-xs text-muted-foreground">
                A loja ainda não cadastrou o WhatsApp de pedidos. Copie a
                mensagem e envie pelo canal de sua preferência.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={handleCopy}
              >
                <Copy /> Copiar mensagem
              </Button>
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => {
                  wishlist.clear();
                  setOpen(false);
                  toast.success("Lista esvaziada");
                }}
              >
                Limpar
              </Button>
            </div>
          </div>
        }
      >
        <ul className="divide-y">
          {wishlist.items.map((item) => (
            <li key={item.id} className="flex gap-3 py-3">
              <ProductMedia
                name={item.name}
                color={item.color}
                className="size-16 shrink-0 rounded-lg"
                compact
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ColorSwatch color={item.color} className="size-3" />
                  {item.color} · Tam. {item.size}
                </p>
                {showPrices ? (
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {formatBRL(item.price * item.quantity)}
                  </p>
                ) : null}

                <div className="mt-2 flex items-center gap-2">
                  <div className="inline-flex items-center rounded-full border">
                    <button
                      type="button"
                      onClick={() => {
                        wishlist.setQuantity(item.id, item.quantity - 1);
                        if (item.quantity === 1 && wishlist.items.length === 1)
                          setOpen(false);
                      }}
                      aria-label={`Diminuir quantidade de ${item.name}`}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-7 text-center text-sm font-medium tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        wishlist.setQuantity(item.id, item.quantity + 1)
                      }
                      aria-label={`Aumentar quantidade de ${item.name}`}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      wishlist.remove(item.id);
                      // Última peça: o painel não faz mais sentido aberto.
                      if (wishlist.items.length === 1) setOpen(false);
                      toast.success("Peça removida da lista");
                    }}
                    aria-label={`Remover ${item.name} da lista`}
                    className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {showPrices ? (
          <div className="mt-3 flex items-baseline justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold tabular-nums">
              {formatBRL(wishlist.total)}
            </span>
          </div>
        ) : null}
      </CatalogSheet>
    </>
  );
}
