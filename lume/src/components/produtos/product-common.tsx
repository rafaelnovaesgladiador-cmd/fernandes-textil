"use client";

import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatPercent } from "@/lib/format";
import type { CreateProductInput } from "@/lib/store";
import type { Product, ProductVariant, StockMovementType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Linha da lista de produtos, já com os números derivados do estado. */
export interface ProductRow {
  product: Product;
  variants: ProductVariant[];
  stock: number;
  margin: number;
  daysSinceLastSale: number;
}

/** Situação de estoque usada nos filtros da lista e nos links dos alertas. */
export type StockFilter = "todos" | "sem_estoque" | "abaixo_minimo" | "parados";

export const STOCK_FILTER_LABELS: Record<StockFilter, string> = {
  todos: "Qualquer situação",
  sem_estoque: "Sem estoque",
  abaixo_minimo: "Abaixo do mínimo",
  parados: "Parados há +90 dias",
};

const STOCK_FILTERS: StockFilter[] = [
  "todos",
  "sem_estoque",
  "abaixo_minimo",
  "parados",
];

/** Lê `?filtro=` dos links de alerta, ignorando valores desconhecidos. */
export function parseStockFilter(value: string | null): StockFilter {
  return STOCK_FILTERS.includes(value as StockFilter)
    ? (value as StockFilter)
    : "todos";
}

/** Preço realmente cobrado: o promocional quando existir. */
export function sellingPrice(
  product: Pick<Product, "price" | "promoPrice">
): number {
  return product.promoPrice ?? product.price;
}

/** Margem sobre o preço de venda — a conta que a lojista usa na etiqueta. */
export function marginPercent(cost: number, price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

export type MarginTone = "boa" | "atencao" | "ruim";

/** Faixas combinadas com o time comercial: >50% boa, 30–50% atenção, <30% ruim. */
export function marginTone(margin: number): MarginTone {
  if (margin > 50) return "boa";
  if (margin >= 30) return "atencao";
  return "ruim";
}

export const MARGIN_TEXT_CLASS: Record<MarginTone, string> = {
  boa: "text-success-text",
  atencao: "text-[#8a6100] dark:text-warning",
  ruim: "text-critical",
};

const MARGIN_BADGE_VARIANT = {
  boa: "success",
  atencao: "warning",
  ruim: "critical",
} as const;

export function MarginText({
  margin,
  className,
}: {
  margin: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        MARGIN_TEXT_CLASS[marginTone(margin)],
        className
      )}
    >
      {formatPercent(margin, 1)}
    </span>
  );
}

export function MarginBadge({ margin }: { margin: number }) {
  return (
    <Badge variant={MARGIN_BADGE_VARIANT[marginTone(margin)]}>
      Margem {formatPercent(margin, 1)}
    </Badge>
  );
}

export function ProductStatusBadge({ status }: { status: Product["status"] }) {
  return status === "ativo" ? (
    <Badge variant="success">Ativo</Badge>
  ) : (
    <Badge variant="secondary">Inativo</Badge>
  );
}

/** Rótulo curto da situação de estoque de um produto. */
export function StockBadge({
  stock,
  minStock,
}: {
  stock: number;
  minStock: number;
}) {
  if (stock === 0) return <Badge variant="critical">Sem estoque</Badge>;
  if (stock <= minStock) return <Badge variant="warning">Estoque baixo</Badge>;
  return <Badge variant="secondary">{stock} peças</Badge>;
}

/** Preço com o valor original riscado quando há promoção. */
export function PriceLabel({
  product,
  className,
}: {
  product: Pick<Product, "price" | "promoPrice">;
  className?: string;
}) {
  const hasPromo =
    product.promoPrice !== undefined && product.promoPrice < product.price;
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className="font-medium tabular-nums">
        {formatBRL(sellingPrice(product))}
      </span>
      {hasPromo ? (
        <span className="text-xs text-muted-foreground line-through tabular-nums">
          {formatBRL(product.price)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Cópia do cadastro: mantém ficha e grade de cores/tamanhos, mas zera o
 * estoque — as peças físicas pertencem ao produto original, não à cópia.
 */
export function duplicateProductInput(
  product: Product,
  variants: ProductVariant[]
): CreateProductInput {
  return {
    name: `${product.name} (cópia)`,
    description: product.description,
    category: product.category,
    collection: product.collection,
    brand: product.brand,
    supplierId: product.supplierId,
    material: product.material,
    cost: product.cost,
    price: product.price,
    promoPrice: product.promoPrice,
    stockLocation: product.stockLocation,
    minStock: product.minStock,
    variants:
      variants.length > 0
        ? variants.map((variant) => ({
            color: variant.color,
            size: variant.size,
            stock: 0,
          }))
        : [{ color: "Único", size: "U" as const, stock: 0 }],
  };
}

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

// ---------------------------------------------------------------------------
// Campos de formulário
// ---------------------------------------------------------------------------

/** Aceita "129,90" e "129.90" — a lojista digita com vírgula. */
export function parseDecimal(value: string): number {
  return Number(String(value).replace(/\s/g, "").replace(",", "."));
}

export function moneyField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .refine((value) => {
      const parsed = parseDecimal(value);
      return Number.isFinite(parsed) && parsed > 0;
    }, `${label} deve ser maior que zero.`);
}

export function optionalMoneyField(label: string) {
  return z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") return true;
      const parsed = parseDecimal(value);
      return Number.isFinite(parsed) && parsed > 0;
    }, `${label} deve ser maior que zero.`);
}

export function integerField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .refine((value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 0;
    }, `${label} deve ser um número inteiro a partir de zero.`);
}

/** Ordena tamanhos na sequência que a loja usa na arara. */
export const SIZE_ORDER = ["P", "M", "G", "GG", "U"] as const;

export function compareSizes(a: string, b: string): number {
  return (
    SIZE_ORDER.indexOf(a as (typeof SIZE_ORDER)[number]) -
    SIZE_ORDER.indexOf(b as (typeof SIZE_ORDER)[number])
  );
}
