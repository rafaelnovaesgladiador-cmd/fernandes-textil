"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form-field";
import { formatBRL } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";
import { compareSizes, sellingPrice } from "./product-common";

/** Simulação visual do código de barras — o traço real sai na impressora. */
function BarcodeStripes({ code }: { code: string }) {
  const bars = code.split("").flatMap((char, index) => {
    const digit = Number(char);
    const value = Number.isFinite(digit) ? digit : 1;
    return [
      { dark: true, width: 1 + (value % 3) },
      { dark: false, width: 1 + ((value + index) % 3) },
    ];
  });

  return (
    <div className="flex h-10 items-stretch gap-px" aria-hidden="true">
      {bars.map((bar, index) => (
        <span
          key={index}
          style={{ width: `${bar.width}px` }}
          className={bar.dark ? "bg-foreground" : "bg-transparent"}
        />
      ))}
    </div>
  );
}

export function LabelPrintDialog({
  open,
  onOpenChange,
  product,
  variants,
  storeName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  variants: ProductVariant[];
  storeName: string;
}) {
  const sorted = [...variants].sort(
    (a, b) => a.color.localeCompare(b.color) || compareSizes(a.size, b.size)
  );
  const [variantId, setVariantId] = useState<string>("produto");
  const selected = sorted.find((variant) => variant.id === variantId);

  const sku = selected?.sku ?? product.sku;
  const barcode = selected?.barcode ?? product.barcode;
  const price = sellingPrice(product);
  const hasPromo = product.promoPrice !== undefined && product.promoPrice < product.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imprimir etiqueta</DialogTitle>
          <DialogDescription>
            Confira a etiqueta antes de enviar para a impressora.
          </DialogDescription>
        </DialogHeader>

        {sorted.length > 0 ? (
          <Field label="Variação" htmlFor="etiqueta-variacao" required>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger id="etiqueta-variacao" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="produto">
                  Etiqueta do produto (sem variação)
                </SelectItem>
                {sorted.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.color} · {variant.size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        <div className="mx-auto w-full max-w-64 rounded-lg border-2 border-dashed bg-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {storeName}
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-medium leading-tight">
            {product.name}
          </p>
          {selected ? (
            <p className="text-xs text-muted-foreground">
              {selected.color} · Tam. {selected.size}
            </p>
          ) : null}
          <p className="mt-2 text-xl font-semibold tabular-nums">
            {formatBRL(price)}
          </p>
          {hasPromo ? (
            <p className="text-xs text-muted-foreground line-through tabular-nums">
              {formatBRL(product.price)}
            </p>
          ) : null}
          <div className="mt-3 flex justify-center overflow-hidden">
            <BarcodeStripes code={barcode} />
          </div>
          <p className="mt-1 font-mono text-[11px] tracking-wider">{barcode}</p>
          <p className="text-[10px] text-muted-foreground">{sku}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={() => {
              toast.success("Enviado para a impressora", {
                description: `Etiqueta de ${product.name}${
                  selected ? ` · ${selected.color}/${selected.size}` : ""
                }`,
              });
              onOpenChange(false);
            }}
          >
            <Printer /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
