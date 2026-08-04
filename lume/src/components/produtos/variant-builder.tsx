"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/format";
import type { ProductDraftVariant } from "@/lib/store";
import type { ProductSize } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SIZE_ORDER } from "./product-common";

const SIZES: ProductSize[] = ["P", "M", "G", "GG", "U"];

const comboKey = (color: string, size: ProductSize) => `${color}__${size}`;

/**
 * Monta a grade cor × tamanho, que é como a loja compra e conta as peças:
 * a lojista informa as cores e os tamanhos, e o sistema gera cada combinação
 * com a quantidade inicial.
 */
export function VariantBuilder({
  onChange,
  error,
}: {
  onChange: (variants: ProductDraftVariant[]) => void;
  error?: string;
}) {
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [bulk, setBulk] = useState("");

  const emit = (
    nextColors: string[],
    nextSizes: ProductSize[],
    nextQuantities: Record<string, string>
  ) => {
    const list: ProductDraftVariant[] = [];
    for (const color of nextColors) {
      for (const size of nextSizes) {
        const raw = Number(nextQuantities[comboKey(color, size)] ?? "0");
        list.push({
          color,
          size,
          stock: Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0,
        });
      }
    }
    onChange(list);
  };

  const addColors = () => {
    const parsed = draft
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;
    const next = [...colors];
    for (const color of parsed) {
      const exists = next.some(
        (item) => item.toLowerCase() === color.toLowerCase()
      );
      if (!exists) next.push(color);
    }
    setColors(next);
    setDraft("");
    emit(next, sizes, quantities);
  };

  const removeColor = (color: string) => {
    const next = colors.filter((item) => item !== color);
    setColors(next);
    emit(next, sizes, quantities);
  };

  const toggleSize = (size: ProductSize) => {
    const next = sizes.includes(size)
      ? sizes.filter((item) => item !== size)
      : [...sizes, size].sort(
          (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
        );
    setSizes(next);
    emit(colors, next, quantities);
  };

  const setQuantity = (color: string, size: ProductSize, value: string) => {
    const next = { ...quantities, [comboKey(color, size)]: value };
    setQuantities(next);
    emit(colors, sizes, next);
  };

  const applyToAll = () => {
    const value = String(Math.max(0, Math.trunc(Number(bulk) || 0)));
    const next = { ...quantities };
    for (const color of colors) {
      for (const size of sizes) next[comboKey(color, size)] = value;
    }
    setQuantities(next);
    emit(colors, sizes, next);
  };

  const combos = colors.flatMap((color) =>
    sizes.map((size) => ({ color, size }))
  );
  const totalPieces = combos.reduce(
    (sum, combo) =>
      sum + Math.max(0, Math.trunc(Number(quantities[comboKey(combo.color, combo.size)]) || 0)),
    0
  );

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="variacao-cor">Cores</Label>
        <div className="flex gap-2">
          <Input
            id="variacao-cor"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addColors();
              }
            }}
            placeholder="Ex.: Preto, Off White, Terracota"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={addColors}
            aria-label="Adicionar cor"
          >
            <Plus /> Adicionar
          </Button>
        </div>
        {colors.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {colors.map((color) => (
              <Badge key={color} variant="secondary" className="pr-1">
                {color}
                <button
                  type="button"
                  onClick={() => removeColor(color)}
                  aria-label={`Remover cor ${color}`}
                  className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Digite a cor e pressione Enter. Separe várias por vírgula.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Tamanhos</Label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => {
            const selected = sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                aria-pressed={selected}
                className={cn(
                  "h-9 min-w-12 rounded-md border px-3 text-sm font-medium transition-colors cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card hover:bg-secondary"
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          U = tamanho único (acessórios e peças sem grade).
        </p>
      </div>

      {combos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Escolha ao menos uma cor e um tamanho para gerar a grade de variações.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                Grade de variações ({combos.length})
              </p>
              <p className="text-xs text-muted-foreground">
                Informe quantas peças entram de cada combinação.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="variacao-bulk" className="text-xs">
                  Preencher todas
                </Label>
                <Input
                  id="variacao-bulk"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={bulk}
                  onChange={(event) => setBulk(event.target.value)}
                  className="h-8 w-20"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyToAll}
              >
                Aplicar
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {combos.map(({ color, size }) => {
              const key = comboKey(color, size);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                >
                  <label
                    htmlFor={`qtd-${key}`}
                    className="min-w-0 flex-1 truncate text-sm"
                  >
                    <span className="font-medium">{color}</span>
                    <span className="text-muted-foreground"> · {size}</span>
                  </label>
                  <Input
                    id={`qtd-${key}`}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={quantities[key] ?? "0"}
                    onChange={(event) =>
                      setQuantity(color, size, event.target.value)
                    }
                    className="h-8 w-20 text-right"
                  />
                </div>
              );
            })}
          </div>

          <p className="text-sm">
            Total de peças:{" "}
            <span className="font-semibold tabular-nums">
              {formatNumber(totalPieces)}
            </span>
          </p>
        </div>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
