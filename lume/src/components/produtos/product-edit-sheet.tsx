"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Field } from "@/components/form-field";
import { updateProduct } from "@/lib/store";
import type { Product } from "@/lib/types";
import { MarginIndicator } from "./margin-indicator";
import {
  integerField,
  moneyField,
  optionalMoneyField,
  parseDecimal,
} from "./product-common";

const schema = z.object({
  name: z.string().trim().min(2, "O nome precisa ter ao menos 2 caracteres."),
  cost: moneyField("o custo"),
  price: moneyField("o preço de venda"),
  promoPrice: optionalMoneyField("O preço promocional"),
  minStock: integerField("o estoque mínimo"),
  stockLocation: z.string().trim(),
  status: z.enum(["ativo", "inativo"]),
});

type EditForm = z.infer<typeof schema>;

function toForm(product: Product): EditForm {
  return {
    name: product.name,
    cost: String(product.cost),
    price: String(product.price),
    promoPrice: product.promoPrice ? String(product.promoPrice) : "",
    minStock: String(product.minStock),
    stockLocation: product.stockLocation,
    status: product.status,
  };
}

/** Edição rápida da ficha comercial — o que muda no dia a dia da loja. */
export function ProductEditSheet({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<EditForm>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? toForm(product)
      : {
          name: "",
          cost: "",
          price: "",
          promoPrice: "",
          minStock: "0",
          stockLocation: "",
          status: "ativo",
        },
  });

  const { reset, register, handleSubmit, control, setValue, formState } = form;

  useEffect(() => {
    if (product && open) reset(toForm(product));
  }, [product, open, reset]);

  const cost = parseDecimal(useWatch({ control, name: "cost" }) || "0");
  const price = parseDecimal(useWatch({ control, name: "price" }) || "0");
  const promo = parseDecimal(useWatch({ control, name: "promoPrice" }) || "0");
  const status = useWatch({ control, name: "status" });

  const onSubmit = handleSubmit((values) => {
    if (!product) return;
    const promoValue = values.promoPrice
      ? parseDecimal(values.promoPrice)
      : undefined;

    updateProduct(product.id, {
      name: values.name.trim(),
      cost: parseDecimal(values.cost),
      price: parseDecimal(values.price),
      promoPrice: promoValue,
      minStock: Number(values.minStock),
      stockLocation: values.stockLocation.trim(),
      status: values.status,
    });

    toast.success("Produto atualizado", { description: values.name.trim() });
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar produto</SheetTitle>
          <SheetDescription>
            {product ? `${product.sku} · ${product.category}` : ""}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col">
          <div className="grid gap-4 px-4 pb-4">
            <Field
              label="Nome"
              htmlFor="edit-nome"
              required
              error={formState.errors.name?.message}
            >
              <Input id="edit-nome" {...register("name")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Custo (R$)"
                htmlFor="edit-custo"
                required
                error={formState.errors.cost?.message}
              >
                <Input
                  id="edit-custo"
                  inputMode="decimal"
                  {...register("cost")}
                />
              </Field>
              <Field
                label="Preço (R$)"
                htmlFor="edit-preco"
                required
                error={formState.errors.price?.message}
              >
                <Input
                  id="edit-preco"
                  inputMode="decimal"
                  {...register("price")}
                />
              </Field>
            </div>

            <Field
              label="Preço promocional (R$)"
              htmlFor="edit-promo"
              error={formState.errors.promoPrice?.message}
              hint="Deixe em branco para vender pelo preço cheio."
            >
              <Input
                id="edit-promo"
                inputMode="decimal"
                {...register("promoPrice")}
              />
            </Field>

            <MarginIndicator
              cost={cost}
              price={price}
              promoPrice={promo > 0 ? promo : undefined}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Estoque mínimo"
                htmlFor="edit-minimo"
                required
                error={formState.errors.minStock?.message}
              >
                <Input
                  id="edit-minimo"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  {...register("minStock")}
                />
              </Field>
              <Field label="Localização" htmlFor="edit-local">
                <Input
                  id="edit-local"
                  placeholder="Ex.: Arara B2"
                  {...register("stockLocation")}
                />
              </Field>
            </div>

            <Field label="Status" htmlFor="edit-status" required>
              <Select
                value={status}
                onValueChange={(next) =>
                  setValue("status", next as EditForm["status"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="edit-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-auto flex gap-2 border-t p-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar alterações
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
