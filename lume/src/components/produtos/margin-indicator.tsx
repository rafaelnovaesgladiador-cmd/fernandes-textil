"use client";

import { TriangleAlert } from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MARGIN_TEXT_CLASS, marginPercent, marginTone } from "./product-common";

const TONE_HINT = {
  boa: "Margem saudável para moda feminina.",
  atencao: "Margem apertada: confira frete, taxas de cartão e descontos.",
  ruim: "Margem baixa — reveja o preço ou negocie o custo com o fornecedor.",
} as const;

const TONE_BOX = {
  boa: "border-success/40 bg-success/8",
  atencao: "border-warning/50 bg-warning/10",
  ruim: "border-critical/40 bg-critical/8",
} as const;

/** Painel de margem em tempo real, com o alerta de preço abaixo do custo. */
export function MarginIndicator({
  cost,
  price,
  promoPrice,
  className,
}: {
  cost: number;
  price: number;
  promoPrice?: number;
  className?: string;
}) {
  const effective = promoPrice && promoPrice > 0 ? promoPrice : price;
  const valid = cost > 0 && effective > 0;
  const margin = valid ? marginPercent(cost, effective) : 0;
  const tone = marginTone(margin);
  const markup = valid && cost > 0 ? effective / cost : 0;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        valid ? TONE_BOX[tone] : "border-dashed",
        className
      )}
      aria-live="polite"
    >
      {!valid ? (
        <p className="text-sm text-muted-foreground">
          Informe custo e preço de venda para ver a margem.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Margem sobre o preço de venda
            </p>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                MARGIN_TEXT_CLASS[tone]
              )}
            >
              {formatPercent(margin, 1)}
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Lucro por peça</dt>
              <dd className="font-medium tabular-nums">
                {formatBRL(effective - cost)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Markup</dt>
              <dd className="font-medium tabular-nums">
                {markup.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}×
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Preço praticado</dt>
              <dd className="font-medium tabular-nums">
                {formatBRL(effective)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">{TONE_HINT[tone]}</p>
          {effective <= cost ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-critical">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              O preço praticado está igual ou abaixo do custo. Você pode salvar
              assim, mas cada peça vendida dá prejuízo.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
