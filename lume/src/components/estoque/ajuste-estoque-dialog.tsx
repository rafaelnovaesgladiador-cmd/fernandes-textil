"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
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
import { formatBRL, formatNumber } from "@/lib/format";
import { adjustStock } from "@/lib/store";
import type { StockMovementType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ADJUST_TYPE_HINTS,
  ADJUST_TYPES,
  MOVEMENT_LABELS,
  variantLabel,
  type StockRow,
} from "./stock-meta";

/**
 * Ajuste de estoque por variação.
 *
 * Cada linha é uma cor/tamanho: a loja digita o saldo real, escolhe o tipo de
 * movimentação e explica o motivo. Cada alteração vira uma movimentação
 * auditável — por isso o motivo é obrigatório.
 */
export function AjusteEstoqueDialog({
  row,
  open,
  onOpenChange,
}: {
  row: StockRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [type, setType] = useState<StockMovementType>("entrada");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();

  // Ao abrir para outro produto, os campos voltam ao saldo atual. O ref evita
  // que uma atualização do estoque em segundo plano apague o que está digitado.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      openedFor.current = null;
      return;
    }
    if (!row || openedFor.current === row.product.id) return;
    openedFor.current = row.product.id;
    setQuantities(
      Object.fromEntries(row.variants.map((v) => [v.id, String(v.stock)]))
    );
    setType("entrada");
    setReason("");
    setReasonError(undefined);
  }, [open, row]);

  const changes = useMemo(() => {
    if (!row) return [];
    return row.variants
      .map((variant) => {
        const raw = quantities[variant.id];
        const parsed = Number(raw);
        const valid = raw !== undefined && raw !== "" && Number.isFinite(parsed);
        const newQuantity = valid ? Math.max(0, Math.round(parsed)) : variant.stock;
        return { variant, newQuantity, delta: newQuantity - variant.stock };
      })
      .filter((entry) => entry.delta !== 0);
  }, [row, quantities]);

  if (!row) return null;

  const product = row.product;
  const totalDelta = changes.reduce((sum, entry) => sum + entry.delta, 0);
  const costImpact = totalDelta * product.cost;

  const setQuantity = (variantId: string, value: number) => {
    setQuantities((current) => ({
      ...current,
      [variantId]: String(Math.max(0, value)),
    }));
  };

  const handleSave = () => {
    if (!reason.trim()) {
      setReasonError("Explique o motivo — ele fica registrado no histórico.");
      return;
    }
    if (changes.length === 0) {
      toast.info("Nenhuma quantidade foi alterada.");
      return;
    }

    for (const entry of changes) {
      adjustStock({
        variantId: entry.variant.id,
        newQuantity: entry.newQuantity,
        type,
        reason: reason.trim(),
      });
    }

    const plural =
      changes.length === 1 ? "variação atualizada" : "variações atualizadas";
    const balance =
      totalDelta === 0
        ? "saldo total do produto não mudou"
        : `${totalDelta > 0 ? "+" : ""}${formatNumber(totalDelta)} ${
            Math.abs(totalDelta) === 1 ? "peça" : "peças"
          } · ${formatBRL(Math.abs(costImpact))} em custo ${
            totalDelta > 0 ? "somados ao" : "retirados do"
          } estoque`;
    toast.success(`${changes.length} ${plural} em ${product.name}`, {
      description: `${MOVEMENT_LABELS[type]} · ${balance}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <DialogDescription>
            {product.name} · {product.sku} · saldo atual de{" "}
            {formatNumber(row.stock)} {row.stock === 1 ? "peça" : "peças"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Quantidade real por variação
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
            {row.variants.map((variant) => {
              const value = quantities[variant.id] ?? String(variant.stock);
              const parsed = Number(value === "" ? variant.stock : value);
              const delta = Math.max(0, Math.round(parsed)) - variant.stock;
              const below = Math.max(0, Math.round(parsed)) < variant.minStock;
              return (
                <li
                  key={variant.id}
                  className="flex items-center gap-2 rounded-md px-1 py-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {variantLabel(variant)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Atual: {formatNumber(variant.stock)} · mínimo{" "}
                      {formatNumber(variant.minStock)}
                      {below ? " · abaixo do mínimo" : ""}
                    </p>
                  </div>
                  {delta !== 0 ? (
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium tabular-nums",
                        delta > 0 ? "text-success-text" : "text-critical"
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {formatNumber(delta)}
                    </span>
                  ) : null}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Diminuir uma peça de ${variantLabel(variant)}`}
                      onClick={() =>
                        setQuantity(variant.id, Math.round(Number(value || 0)) - 1)
                      }
                    >
                      <Minus />
                    </Button>
                    <Input
                      value={value}
                      inputMode="numeric"
                      aria-label={`Quantidade de ${variantLabel(variant)}`}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [variant.id]: event.target.value.replace(/[^\d]/g, ""),
                        }))
                      }
                      className="h-8 w-16 text-center tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Aumentar uma peça de ${variantLabel(variant)}`}
                      onClick={() =>
                        setQuantity(variant.id, Math.round(Number(value || 0)) + 1)
                      }
                    >
                      <Plus />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Tipo de movimentação"
            required
            hint={ADJUST_TYPE_HINTS[type]}
          >
            <Select
              value={type}
              onValueChange={(value) => setType(value as StockMovementType)}
            >
              <SelectTrigger className="w-full" aria-label="Tipo de movimentação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUST_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {MOVEMENT_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Motivo"
            htmlFor="ajuste-motivo"
            required
            error={reasonError}
            hint="Ex.: contagem do inventário de agosto"
          >
            <Input
              id="ajuste-motivo"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              placeholder="Contagem do inventário"
              aria-invalid={reasonError ? true : undefined}
            />
          </Field>
        </div>

        <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
          {changes.length === 0 ? (
            "Nenhuma alteração ainda — mude a quantidade de pelo menos uma variação."
          ) : (
            <>
              <span className="font-medium text-foreground">
                {changes.length}{" "}
                {changes.length === 1 ? "variação alterada" : "variações alteradas"}
              </span>{" "}
              · saldo do produto vai de {formatNumber(row.stock)} para{" "}
              {formatNumber(row.stock + totalDelta)} peças
              {totalDelta === 0
                ? " (troca entre variações)"
                : ` · ${totalDelta > 0 ? "entra" : "sai"} ${formatBRL(
                    Math.abs(costImpact)
                  )} em custo`}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={changes.length === 0}>
            Salvar ajuste
            {changes.length > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {changes.length}
              </Badge>
            ) : null}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
