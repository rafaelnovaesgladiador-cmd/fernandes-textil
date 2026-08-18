"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/client-store";
import type { ProductSize } from "@/lib/types";

/**
 * Lista de interesse da vitrine — um carrinho leve.
 *
 * Vive no navegador da cliente (não no estado da loja): ela monta a lista,
 * fecha a aba, volta depois e continua de onde parou.
 */

export const WISHLIST_STORAGE_KEY = "lume.vitrine.lista";

export interface WishlistItem {
  /** produto + cor + tamanho */
  id: string;
  productId: string;
  name: string;
  category: string;
  color: string;
  size: ProductSize;
  /** Preço unitário vigente no momento em que a peça entrou na lista. */
  price: number;
  quantity: number;
}

const EMPTY: WishlistItem[] = [];

export function wishlistItemId(
  productId: string,
  color: string,
  size: ProductSize
): string {
  return `${productId}::${color}::${size}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toItem(value: unknown): WishlistItem | null {
  if (!isRecord(value)) return null;
  const { productId, name, category, color, size, price, quantity } = value;
  if (
    typeof productId !== "string" ||
    typeof name !== "string" ||
    typeof color !== "string" ||
    typeof size !== "string" ||
    typeof price !== "number" ||
    typeof quantity !== "number"
  ) {
    return null;
  }
  const parsedSize = size as ProductSize;
  return {
    id: wishlistItemId(productId, color, parsedSize),
    productId,
    name,
    category: typeof category === "string" ? category : "",
    color,
    size: parsedSize,
    price,
    quantity: Math.max(1, Math.round(quantity)),
  };
}

function parse(raw: string | null): WishlistItem[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    const items = data
      .map(toItem)
      .filter((item): item is WishlistItem => item !== null);
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

const store = createLocalStore<WishlistItem[]>(
  WISHLIST_STORAGE_KEY,
  parse,
  EMPTY
);

function write(items: WishlistItem[]): void {
  store.write(items.length > 0 ? JSON.stringify(items) : null);
}

export interface WishlistApi {
  items: WishlistItem[];
  count: number;
  total: number;
  add: (item: Omit<WishlistItem, "id" | "quantity">, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export function useWishlist(): WishlistApi {
  const items = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  const add = useCallback(
    (input: Omit<WishlistItem, "id" | "quantity">, quantity = 1) => {
      const id = wishlistItemId(input.productId, input.color, input.size);
      const current = store.getSnapshot();
      const existing = current.find((item) => item.id === id);
      const next = existing
        ? current.map((item) =>
            item.id === id
              ? { ...item, quantity: item.quantity + quantity, price: input.price }
              : item
          )
        : [...current, { ...input, id, quantity }];
      write(next);
    },
    []
  );

  const setQuantity = useCallback((id: string, quantity: number) => {
    const current = store.getSnapshot();
    const next =
      quantity <= 0
        ? current.filter((item) => item.id !== id)
        : current.map((item) => (item.id === id ? { ...item, quantity } : item));
    write(next);
  }, []);

  const remove = useCallback((id: string) => {
    write(store.getSnapshot().filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => write(EMPTY), []);

  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    add,
    setQuantity,
    remove,
    clear,
  };
}
