"use client";

import { TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DiscountMode, SaleTotals } from "./sale-totals";

/** Desconto em reais ou em percentual, com aviso acima do limite da loja. */
export function DiscountField({
  id,
  mode,
  input,
  onModeChange,
  onInputChange,
  totals,
  maxPercent,
}: {
  /** Id do campo — a tela renderiza o carrinho duas vezes (desktop e gaveta). */
  id: string;
  mode: DiscountMode;
  input: string;
  onModeChange: (mode: DiscountMode) => void;
  onInputChange: (value: string) => void;
  totals: SaleTotals;
  maxPercent: number;
}) {
  const exceeded = totals.discount > 0 && totals.discountPercent > maxPercent;

  const toggle = (value: DiscountMode, label: string, hint: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      aria-label={hint}
      onClick={() => onModeChange(value)}
      className={cn(
        "h-11 min-w-11 rounded-md px-3 text-sm font-medium transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring/50 lg:h-8",
        mode === value
          ? "bg-card shadow-xs text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        Desconto
        <span className="font-normal text-muted-foreground">(opcional)</span>
      </Label>
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-secondary p-0.5">
          {toggle("reais", "R$", "Desconto em reais")}
          {toggle("percent", "%", "Desconto em porcentagem")}
        </div>
        <Input
          id={id}
          value={input}
          inputMode="decimal"
          placeholder={mode === "reais" ? "0,00" : "0"}
          onChange={(event) => onInputChange(event.target.value)}
          aria-describedby={`${id}-ajuda`}
          className="h-11 flex-1 tabular-nums lg:h-9"
        />
      </div>
      <p
        id={`${id}-ajuda`}
        className={cn(
          "flex items-start gap-1.5 text-xs",
          exceeded ? "text-[#8a6100] dark:text-warning" : "text-muted-foreground"
        )}
      >
        {exceeded ? <TriangleAlert className="mt-px size-3.5 shrink-0" /> : null}
        {exceeded
          ? `Desconto de ${formatPercent(totals.discountPercent, 1)} passa do limite de ${formatPercent(maxPercent)} da loja. Confirme com a gerência antes de finalizar.`
          : totals.discount > 0
            ? `Aplicado: ${formatBRL(totals.discount)} (${formatPercent(totals.discountPercent, 1)}) — limite da loja: ${formatPercent(maxPercent)}.`
            : `Limite sugerido pela loja: ${formatPercent(maxPercent)} do valor da venda.`}
      </p>
    </div>
  );
}
