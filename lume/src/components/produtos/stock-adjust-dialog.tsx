"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form-field";
import { adjustStock } from "@/lib/store";
import type { Product, ProductVariant, StockMovementType } from "@/lib/types";
import { compareSizes } from "./product-common";

/** Motivos de ajuste que a loja usa no balcão. */
const MOVEMENT_OPTIONS: Array<{ value: StockMovementType; label: string }> = [
  { value: "ajuste", label: "Ajuste manual" },
  { value: "inventario", label: "Contagem de inventário" },
  { value: "entrada", label: "Entrada de mercadoria" },
  { value: "perda", label: "Perda" },
  { value: "avaria", label: "Avaria" },
  { value: "devolucao", label: "Devolução de cliente" },
  { value: "transferencia", label: "Transferência entre unidades" },
];

export interface StockAdjustTarget {
  product: Product;
  variants: ProductVariant[];
  /** Quando informado, o diálogo já abre na variação escolhida. */
  variantId?: string;
}

export function StockAdjustDialog({
  target,
  onClose,
}: {
  target: StockAdjustTarget | null;
  onClose: () => void;
}) {
  const sorted = [...(target?.variants ?? [])].sort(
    (a, b) => a.color.localeCompare(b.color) || compareSizes(a.size, b.size)
  );

  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [type, setType] = useState<StockMovementType>("ajuste");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Cada abertura recebe um alvo novo: reinicia o formulário durante a
  // renderização, sem o piscar de um efeito depois do commit.
  const [openedFor, setOpenedFor] = useState<StockAdjustTarget | null>(null);
  if (target !== openedFor) {
    setOpenedFor(target);
    const initial = target?.variantId ?? sorted[0]?.id ?? "";
    setVariantId(initial);
    setQuantity(String(sorted.find((v) => v.id === initial)?.stock ?? 0));
    setType("ajuste");
    setReason("");
    setError(null);
  }

  const selected = sorted.find((variant) => variant.id === variantId);

  const submit = () => {
    if (!target || !selected) return;
    const newQuantity = Number(quantity);
    if (!Number.isInteger(newQuantity) || newQuantity < 0) {
      setError("Informe uma quantidade inteira igual ou maior que zero.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Descreva o motivo do ajuste — ele fica no histórico.");
      return;
    }
    if (newQuantity === selected.stock) {
      setError("A quantidade informada é igual à atual.");
      return;
    }

    adjustStock({
      variantId: selected.id,
      newQuantity,
      type,
      reason: reason.trim(),
    });
    toast.success("Estoque ajustado", {
      description: `${target.product.name} · ${selected.color}/${selected.size}: ${selected.stock} → ${newQuantity}`,
    });
    onClose();
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.product.name} · ${target.product.sku}`
              : "Selecione uma variação"}
          </DialogDescription>
        </DialogHeader>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este produto ainda não tem variações cadastradas.
          </p>
        ) : (
          <div className="grid gap-4">
            <Field label="Variação" htmlFor="ajuste-variacao" required>
              <Select
                value={variantId}
                onValueChange={(next) => {
                  setVariantId(next);
                  setQuantity(
                    String(sorted.find((v) => v.id === next)?.stock ?? 0)
                  );
                }}
              >
                <SelectTrigger id="ajuste-variacao" className="w-full">
                  <SelectValue placeholder="Escolha a variação" />
                </SelectTrigger>
                <SelectContent>
                  {sorted.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.color} · {variant.size} — {variant.stock} em
                      estoque
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nova quantidade"
                htmlFor="ajuste-quantidade"
                required
                hint={
                  selected ? `Estoque atual: ${selected.stock}` : undefined
                }
              >
                <Input
                  id="ajuste-quantidade"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </Field>

              <Field label="Tipo de movimentação" htmlFor="ajuste-tipo" required>
                <Select
                  value={type}
                  onValueChange={(next) => setType(next as StockMovementType)}
                >
                  <SelectTrigger id="ajuste-tipo" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              label="Motivo"
              htmlFor="ajuste-motivo"
              required
              error={error ?? undefined}
              hint="Ex.: contagem de inventário, peça com defeito, entrada de fornecedor."
            >
              <Input
                id="ajuste-motivo"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Motivo do ajuste"
              />
            </Field>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={sorted.length === 0}>
            Salvar ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
