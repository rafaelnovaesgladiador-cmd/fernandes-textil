"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/hooks/use-store";
import { createProduct } from "@/lib/store";
import { CategorySelect } from "@/components/produtos/category-select";
import { MarginIndicator } from "@/components/produtos/margin-indicator";
import { VariantBuilder } from "@/components/produtos/variant-builder";
import {
  integerField,
  moneyField,
  optionalMoneyField,
  parseDecimal,
} from "@/components/produtos/product-common";

const schema = z.object({
  name: z.string().trim().min(2, "O nome precisa ter ao menos 2 caracteres."),
  description: z.string().trim(),
  category: z.string().trim().min(1, "Escolha ou crie uma categoria."),
  collection: z.string().trim().min(1, "Informe a coleção."),
  brand: z.string().trim(),
  supplierId: z.string().min(1, "Escolha o fornecedor."),
  material: z.string().trim(),
  cost: moneyField("o custo"),
  price: moneyField("o preço de venda"),
  promoPrice: optionalMoneyField("O preço promocional"),
  stockLocation: z.string().trim(),
  minStock: integerField("o estoque mínimo"),
  variants: z
    .array(
      z.object({
        color: z.string().min(1),
        size: z.enum(["P", "M", "G", "GG", "U"]),
        stock: z.number().int().min(0),
      })
    )
    .min(1, "Escolha ao menos uma cor e um tamanho para gerar a grade."),
});

type NewProductForm = z.infer<typeof schema>;

export default function NovoProdutoPage() {
  const router = useRouter();
  const state = useStore();

  const suggestions = useMemo(
    () => ({
      categories: [...new Set(state.products.map((p) => p.category))].sort(
        (a, b) => a.localeCompare(b)
      ),
      collections: [...new Set(state.products.map((p) => p.collection))].sort(
        (a, b) => a.localeCompare(b)
      ),
      brands: [...new Set(state.products.map((p) => p.brand))].sort((a, b) =>
        a.localeCompare(b)
      ),
      materials: [...new Set(state.products.map((p) => p.material))].sort(
        (a, b) => a.localeCompare(b)
      ),
      locations: [...new Set(state.products.map((p) => p.stockLocation))].sort(
        (a, b) => a.localeCompare(b)
      ),
    }),
    [state.products]
  );

  const { register, handleSubmit, control, setValue, formState } =
    useForm<NewProductForm>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: "",
        description: "",
        category: "",
        collection: "",
        brand: "",
        supplierId: state.suppliers[0]?.id ?? "",
        material: "",
        cost: "",
        price: "",
        promoPrice: "",
        stockLocation: "",
        minStock: "2",
        variants: [],
      },
    });

  const errors = formState.errors;
  const cost = parseDecimal(useWatch({ control, name: "cost" }) || "0");
  const price = parseDecimal(useWatch({ control, name: "price" }) || "0");
  const promo = parseDecimal(useWatch({ control, name: "promoPrice" }) || "0");
  const category = useWatch({ control, name: "category" });
  const supplierId = useWatch({ control, name: "supplierId" });
  const variants = useWatch({ control, name: "variants" });

  const totalPieces = variants.reduce((sum, variant) => sum + variant.stock, 0);

  const onSubmit = handleSubmit((values) => {
    const productId = createProduct({
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
      collection: values.collection.trim(),
      brand: values.brand.trim(),
      supplierId: values.supplierId,
      material: values.material.trim(),
      cost: parseDecimal(values.cost),
      price: parseDecimal(values.price),
      promoPrice: values.promoPrice ? parseDecimal(values.promoPrice) : undefined,
      stockLocation: values.stockLocation.trim(),
      minStock: Number(values.minStock),
      variants: values.variants,
    });

    toast.success("Produto cadastrado", {
      description: `${values.name.trim()} · ${values.variants.length} ${
        values.variants.length === 1 ? "variação" : "variações"
      }`,
    });
    router.push(`/produtos/${productId}`);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title="Novo produto"
        description="Cadastre a peça, defina o preço e gere a grade de cor e tamanho."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/produtos")}
          >
            <ArrowLeft /> Voltar
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field
                label="Nome do produto"
                htmlFor="produto-nome"
                required
                error={errors.name?.message}
              >
                <Input
                  id="produto-nome"
                  placeholder="Ex.: Vestido Midi Canelado"
                  {...register("name")}
                />
              </Field>

              <Field
                label="Descrição"
                htmlFor="produto-descricao"
                hint="Aparece no catálogo virtual e ajuda no atendimento."
              >
                <Textarea
                  id="produto-descricao"
                  placeholder="Modelagem, caimento, ocasião de uso…"
                  {...register("description")}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Categoria"
                  htmlFor="produto-categoria"
                  required
                  error={errors.category?.message}
                >
                  <CategorySelect
                    id="produto-categoria"
                    value={category}
                    options={suggestions.categories}
                    onChange={(value) =>
                      setValue("category", value, { shouldValidate: true })
                    }
                  />
                </Field>

                <Field
                  label="Coleção"
                  htmlFor="produto-colecao"
                  required
                  error={errors.collection?.message}
                >
                  <Input
                    id="produto-colecao"
                    list="opcoes-colecao"
                    placeholder="Ex.: Verão 2026"
                    {...register("collection")}
                  />
                  <datalist id="opcoes-colecao">
                    {suggestions.collections.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Marca" htmlFor="produto-marca">
                  <Input
                    id="produto-marca"
                    list="opcoes-marca"
                    {...register("brand")}
                  />
                  <datalist id="opcoes-marca">
                    {suggestions.brands.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </Field>

                <Field
                  label="Fornecedor"
                  htmlFor="produto-fornecedor"
                  required
                  error={errors.supplierId?.message}
                >
                  <Select
                    value={supplierId}
                    onValueChange={(value) =>
                      setValue("supplierId", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="produto-fornecedor" className="w-full">
                      <SelectValue placeholder="Escolha o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} · {supplier.city}/{supplier.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Material" htmlFor="produto-material">
                  <Input
                    id="produto-material"
                    list="opcoes-material"
                    placeholder="Ex.: Viscose"
                    {...register("material")}
                  />
                  <datalist id="opcoes-material">
                    {suggestions.materials.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variações</CardTitle>
            </CardHeader>
            <CardContent>
              <VariantBuilder
                onChange={(next) =>
                  setValue("variants", next, {
                    shouldValidate: formState.isSubmitted,
                  })
                }
                error={errors.variants?.message}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preços</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field
                label="Custo (R$)"
                htmlFor="produto-custo"
                required
                error={errors.cost?.message}
                hint="Quanto você pagou por peça ao fornecedor."
              >
                <Input
                  id="produto-custo"
                  inputMode="decimal"
                  placeholder="0,00"
                  {...register("cost")}
                />
              </Field>

              <Field
                label="Preço de venda (R$)"
                htmlFor="produto-preco"
                required
                error={errors.price?.message}
              >
                <Input
                  id="produto-preco"
                  inputMode="decimal"
                  placeholder="0,00"
                  {...register("price")}
                />
              </Field>

              <Field
                label="Preço promocional (R$)"
                htmlFor="produto-promo"
                error={errors.promoPrice?.message}
                hint="Deixe em branco se a peça não estiver em promoção."
              >
                <Input
                  id="produto-promo"
                  inputMode="decimal"
                  placeholder="0,00"
                  {...register("promoPrice")}
                />
              </Field>

              <MarginIndicator
                cost={cost}
                price={price}
                promoPrice={promo > 0 ? promo : undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estoque</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field
                label="Localização no estoque"
                htmlFor="produto-local"
                hint="Onde a peça fica na loja — agiliza a separação."
              >
                <Input
                  id="produto-local"
                  list="opcoes-local"
                  placeholder="Ex.: Arara B2"
                  {...register("stockLocation")}
                />
                <datalist id="opcoes-local">
                  {suggestions.locations.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </Field>

              <Field
                label="Estoque mínimo por variação"
                htmlFor="produto-minimo"
                required
                error={errors.minStock?.message}
                hint="Abaixo disso o produto entra nos alertas de reposição."
              >
                <Input
                  id="produto-minimo"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  {...register("minStock")}
                />
              </Field>

              <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
                <p className="text-muted-foreground">Entrada inicial</p>
                <p className="mt-0.5 font-semibold tabular-nums">
                  {totalPieces} {totalPieces === 1 ? "peça" : "peças"} em{" "}
                  {variants.length}{" "}
                  {variants.length === 1 ? "variação" : "variações"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/produtos")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          Salvar produto
        </Button>
      </div>
    </form>
  );
}
