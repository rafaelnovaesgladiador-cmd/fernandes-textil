"use client";

import { variantsByProduct } from "@/lib/metrics";
import type { AppState } from "@/lib/store";
import type { Product, ProductSize } from "@/lib/types";

/**
 * Recorte do estoque que vira vitrine.
 *
 * A administração e a vitrine pública leem exatamente estes dados, então o que
 * o lojista publica é o que a cliente enxerga — sem duplicar regra de negócio.
 */

export const SIZE_ORDER: ProductSize[] = ["P", "M", "G", "GG", "U"];

/** Estoque total a partir do qual a peça deixa de ser "últimas peças". */
export const LAST_PIECES_THRESHOLD = 3;

export interface CatalogColor {
  name: string;
  stock: number;
  sizes: ProductSize[];
}

export interface CatalogItem {
  product: Product;
  /** Preço vigente (promocional quando houver). */
  price: number;
  /** Preço cheio, exibido riscado quando há promoção. */
  listPrice: number;
  hasPromo: boolean;
  discountPercent: number;
  stock: number;
  colors: CatalogColor[];
  sizes: ProductSize[];
  isFeatured: boolean;
  isLastPieces: boolean;
}

export interface CatalogFilters {
  query: string;
  category: string;
  collection: string;
}

export const ALL_OPTION = "todas";

export function sortSizes(sizes: ProductSize[]): ProductSize[] {
  return [...sizes].sort(
    (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
  );
}

/**
 * Produtos publicáveis: ativos e com pelo menos uma variação em estoque.
 * Variações zeradas não entram nas cores/tamanhos oferecidos.
 */
export function buildCatalogItems(state: AppState): CatalogItem[] {
  const byProduct = variantsByProduct(state);
  const featured = new Set(state.settings.catalog.featuredProductIds);
  const items: CatalogItem[] = [];

  for (const product of state.products) {
    if (product.status !== "ativo") continue;

    const available = (byProduct.get(product.id) ?? []).filter(
      (variant) => variant.stock > 0
    );
    const stock = available.reduce((sum, variant) => sum + variant.stock, 0);
    if (stock <= 0) continue;

    const grouped = new Map<string, { stock: number; sizes: Set<ProductSize> }>();
    for (const variant of available) {
      const entry = grouped.get(variant.color) ?? {
        stock: 0,
        sizes: new Set<ProductSize>(),
      };
      entry.stock += variant.stock;
      entry.sizes.add(variant.size);
      grouped.set(variant.color, entry);
    }

    const colors: CatalogColor[] = [...grouped.entries()]
      .map(([name, entry]) => ({
        name,
        stock: entry.stock,
        sizes: sortSizes([...entry.sizes]),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    const hasPromo =
      product.promoPrice !== undefined && product.promoPrice < product.price;
    const price = hasPromo ? product.promoPrice! : product.price;

    items.push({
      product,
      price,
      listPrice: product.price,
      hasPromo,
      discountPercent: hasPromo
        ? Math.round(((product.price - price) / product.price) * 100)
        : 0,
      stock,
      colors,
      sizes: sortSizes([...new Set(available.map((variant) => variant.size))]),
      isFeatured: featured.has(product.id),
      isLastPieces: stock <= LAST_PIECES_THRESHOLD,
    });
  }

  // Novidades primeiro: é o que a cliente espera ver ao abrir o link.
  return items.sort((a, b) =>
    b.product.entryDate.localeCompare(a.product.entryDate)
  );
}

export function catalogFacets(items: CatalogItem[]): {
  categories: string[];
  collections: string[];
} {
  const categories = new Set<string>();
  const collections = new Set<string>();
  for (const item of items) {
    categories.add(item.product.category);
    collections.add(item.product.collection);
  }
  const sort = (values: Set<string>) =>
    [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return { categories: sort(categories), collections: sort(collections) };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterCatalog(
  items: CatalogItem[],
  filters: CatalogFilters
): CatalogItem[] {
  const query = normalizeText(filters.query.trim());
  return items.filter((item) => {
    if (
      filters.category !== ALL_OPTION &&
      item.product.category !== filters.category
    ) {
      return false;
    }
    if (
      filters.collection !== ALL_OPTION &&
      item.product.collection !== filters.collection
    ) {
      return false;
    }
    if (!query) return true;
    return (
      normalizeText(item.product.name).includes(query) ||
      normalizeText(item.product.category).includes(query) ||
      normalizeText(item.product.collection).includes(query)
    );
  });
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.category !== ALL_OPTION ||
    filters.collection !== ALL_OPTION
  );
}

/** Valor de etiqueta de tudo que está publicado. */
export function catalogValue(items: CatalogItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.stock, 0);
}

export function sizesForColor(item: CatalogItem, color: string): ProductSize[] {
  return item.colors.find((entry) => entry.name === color)?.sizes ?? item.sizes;
}
