"use client";

import { daysSinceLastSaleByProduct, variantsByProduct } from "@/lib/metrics";
import { demoUser } from "@/lib/mock";
import type { AppState } from "@/lib/store/state";
import type { Product, ProductVariant, StockMovementType } from "@/lib/types";

/**
 * Vocabulário compartilhado do módulo de Estoque.
 *
 * Rótulos, cores e a derivação de "linha de estoque" ficam aqui para que a
 * posição, as análises e o histórico contem exatamente a mesma história —
 * o número do alerta é sempre o mesmo número da lista.
 */

export type StockBadgeVariant =
  | "secondary"
  | "outline"
  | "accent"
  | "success"
  | "warning"
  | "serious"
  | "critical";

export const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  perda: "Perda",
  avaria: "Avaria",
  devolucao: "Devolução",
  troca: "Troca",
  transferencia: "Transferência",
  inventario: "Inventário",
};

export const MOVEMENT_BADGE: Record<StockMovementType, StockBadgeVariant> = {
  entrada: "success",
  saida: "secondary",
  ajuste: "accent",
  perda: "critical",
  avaria: "serious",
  devolucao: "warning",
  troca: "outline",
  transferencia: "outline",
  inventario: "accent",
};

/** Tipos disponíveis para um ajuste manual feito pela loja. */
export const ADJUST_TYPES: StockMovementType[] = [
  "entrada",
  "ajuste",
  "perda",
  "avaria",
  "devolucao",
  "inventario",
];

export const ADJUST_TYPE_HINTS: Partial<Record<StockMovementType, string>> = {
  entrada: "Chegada de mercadoria do fornecedor.",
  ajuste: "Correção pontual de um saldo digitado errado.",
  perda: "Peça extraviada, furtada ou não localizada.",
  avaria: "Peça danificada que não pode ser vendida.",
  devolucao: "Peça devolvida pela cliente e recolocada na arara.",
  inventario: "Resultado da contagem física do estoque.",
};

const SIZE_ORDER = ["P", "M", "G", "GG", "U"];

export type StockStatus = "sem_estoque" | "abaixo" | "ok";

export const STATUS_META: Record<
  StockStatus,
  { label: string; variant: StockBadgeVariant }
> = {
  sem_estoque: { label: "Sem estoque", variant: "critical" },
  abaixo: { label: "Abaixo do mínimo", variant: "warning" },
  ok: { label: "OK", variant: "success" },
};

export interface StockRow {
  product: Product;
  /** Variações ordenadas por cor e tamanho. */
  variants: ProductVariant[];
  stock: number;
  /** Soma dos mínimos de cada variação — o saldo ideal do produto. */
  minimum: number;
  stockCost: number;
  potential: number;
  /** Quantas variações estão abaixo do próprio mínimo. */
  belowMin: number;
  status: StockStatus;
  daysSinceLastSale: number;
  isStalled: boolean;
}

export function sortVariants(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort(
    (a, b) =>
      a.color.localeCompare(b.color, "pt-BR") ||
      SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)
  );
}

export function variantLabel(variant: ProductVariant): string {
  return `${variant.color} · ${variant.size}`;
}

/** Uma linha por produto ativo, com saldo, mínimo e situação de giro. */
export function buildStockRows(state: AppState): StockRow[] {
  const byProduct = variantsByProduct(state);
  const daysSince = daysSinceLastSaleByProduct(state);

  return state.products
    .filter((product) => product.status === "ativo")
    .map((product) => {
      const variants = sortVariants(byProduct.get(product.id) ?? []);
      const stock = variants.reduce((sum, v) => sum + v.stock, 0);
      const minimum = variants.reduce((sum, v) => sum + v.minStock, 0);
      const days = daysSince.get(product.id) ?? 0;
      const status: StockStatus =
        stock === 0 ? "sem_estoque" : stock < minimum ? "abaixo" : "ok";

      return {
        product,
        variants,
        stock,
        minimum,
        stockCost: stock * product.cost,
        potential: stock * (product.promoPrice ?? product.price),
        belowMin: variants.filter((v) => v.stock < v.minStock).length,
        status,
        daysSinceLastSale: days,
        isStalled: days > 90 && stock > 0,
      };
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name, "pt-BR"));
}

export function categoriesOf(rows: StockRow[]): string[] {
  return [...new Set(rows.map((row) => row.product.category))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}

/** Nome de quem registrou a movimentação (proprietário ou vendedora). */
export function userNamesById(state: AppState): Map<string, string> {
  const map = new Map<string, string>([[demoUser.id, demoUser.name]]);
  for (const seller of state.sellers) map.set(seller.userId, seller.name);
  return map;
}

/** Preço sugerido de liquidação (30% de desconto sobre o preço vigente). */
export const LIQUIDATION_DISCOUNT = 0.3;

export function liquidationPrice(product: Product): number {
  return (product.promoPrice ?? product.price) * (1 - LIQUIDATION_DISCOUNT);
}

/** Cobertura alvo ao repor: 45 dias de venda no ritmo atual. */
export const RESTOCK_TARGET_DAYS = 45;

export function suggestedRestock(monthlyAverage: number, stock: number): number {
  return Math.max(
    1,
    Math.ceil((monthlyAverage * RESTOCK_TARGET_DAYS) / 30 - stock)
  );
}
