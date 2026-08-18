"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  PackagePlus,
  Search,
  Sparkles,
  Trash2,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/form-field";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/hooks/use-store";
import { formatBRL, formatNumber } from "@/lib/format";
import { stockAnalysis, variantsByProduct } from "@/lib/metrics";
import { createPurchase } from "@/lib/store";
import type { Product, ProductVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DraftItem {
  productId: string;
  variantId: string;
  quantity: number;
  unitCost: number;
}

interface VariantDraft {
  quantity: string;
  cost: string;
}

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6];

/** Cobertura alvo da sugestão de reposição: 45 dias no ritmo dos últimos 90. */
const TARGET_COVERAGE_MONTHS = 1.5;

/**
 * Pedido de compra: fornecedor, itens por variação e condição de pagamento.
 * O pedido nasce com status "pedido enviado" — o estoque só muda no recebimento.
 */
export function PurchaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useStore();

  const [supplierId, setSupplierId] = useState(
    () => searchParams.get("fornecedor") ?? ""
  );
  const [installments, setInstallments] = useState(3);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>({});
  const [errors, setErrors] = useState<{ supplier?: string; items?: string }>({});
  const [saving, setSaving] = useState(false);

  const productById = useMemo(
    () => new Map(state.products.map((p) => [p.id, p])),
    [state.products]
  );
  const variantById = useMemo(
    () => new Map(state.variants.map((v) => [v.id, v])),
    [state.variants]
  );
  const byProduct = useMemo(() => variantsByProduct(state), [state]);

  const supplierProducts = useMemo(
    () =>
      state.products.filter(
        (p) => p.supplierId === supplierId && p.status === "ativo"
      ),
    [state.products, supplierId]
  );

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return supplierProducts.slice(0, 8);
    return supplierProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      )
      .slice(0, 12);
  }, [search, supplierProducts]);

  const total = items.reduce(
    (sum, item) => sum + item.unitCost * item.quantity,
    0
  );
  const pieces = items.reduce((sum, item) => sum + item.quantity, 0);

  const setDraft = (variantId: string, patch: Partial<VariantDraft>) =>
    setDrafts((current) => ({
      ...current,
      [variantId]: {
        quantity: current[variantId]?.quantity ?? "",
        cost: current[variantId]?.cost ?? "",
        ...patch,
      },
    }));

  const mergeItems = (incoming: DraftItem[]) => {
    setItems((current) => {
      const merged = new Map(current.map((item) => [item.variantId, { ...item }]));
      for (const item of incoming) {
        const existing = merged.get(item.variantId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.unitCost = item.unitCost;
        } else {
          merged.set(item.variantId, { ...item });
        }
      }
      return [...merged.values()];
    });
    setErrors((current) => ({ ...current, items: undefined }));
  };

  const addProductVariants = (product: Product, variants: ProductVariant[]) => {
    const incoming: DraftItem[] = [];
    for (const variant of variants) {
      const draft = drafts[variant.id];
      const quantity = Math.max(0, Math.floor(Number(draft?.quantity ?? 0) || 0));
      if (quantity === 0) continue;
      const parsedCost = Number(draft?.cost ?? "");
      incoming.push({
        productId: product.id,
        variantId: variant.id,
        quantity,
        unitCost: parsedCost > 0 ? parsedCost : product.cost,
      });
    }

    if (incoming.length === 0) {
      toast.error("Informe a quantidade de pelo menos uma variação.");
      return;
    }

    mergeItems(incoming);
    setDrafts((current) => {
      const next = { ...current };
      for (const variant of variants) delete next[variant.id];
      return next;
    });
    setExpandedId(null);
    const added = incoming.reduce((sum, item) => sum + item.quantity, 0);
    toast.success(`${product.name} adicionado`, {
      description: `${formatNumber(added)} ${added === 1 ? "peça" : "peças"} em ${
        incoming.length
      } ${incoming.length === 1 ? "variação" : "variações"}.`,
    });
  };

  const suggestRestock = () => {
    if (!supplierId) {
      setErrors((current) => ({
        ...current,
        supplier: "Escolha o fornecedor para sugerir a reposição.",
      }));
      toast.error("Selecione o fornecedor antes de sugerir a reposição.");
      return;
    }

    const candidates = stockAnalysis(state).filter(
      (row) =>
        row.needsRestock &&
        row.product.status === "ativo" &&
        row.product.supplierId === supplierId
    );

    if (candidates.length === 0) {
      toast.info("Nenhum produto deste fornecedor precisa de reposição agora.", {
        description:
          "A cobertura de estoque de todos eles está acima de 15 dias no ritmo atual.",
      });
      return;
    }

    const incoming: DraftItem[] = [];
    for (const row of candidates) {
      const variants = [...(byProduct.get(row.product.id) ?? [])].sort(
        (a, b) => a.stock - b.stock
      );
      if (variants.length === 0) continue;

      const target = Math.max(
        variants.length,
        Math.ceil(row.monthlyAverage * TARGET_COVERAGE_MONTHS) - row.stock
      );
      const perVariant = new Map(variants.map((v) => [v.id, 0]));
      for (let unit = 0; unit < target; unit++) {
        const variant = variants[unit % variants.length];
        perVariant.set(variant.id, (perVariant.get(variant.id) ?? 0) + 1);
      }
      for (const variant of variants) {
        const quantity = perVariant.get(variant.id) ?? 0;
        if (quantity === 0) continue;
        incoming.push({
          productId: row.product.id,
          variantId: variant.id,
          quantity,
          unitCost: row.product.cost,
        });
      }
    }

    mergeItems(incoming);
    const suggestedPieces = incoming.reduce((sum, i) => sum + i.quantity, 0);
    toast.success(
      `${formatNumber(candidates.length)} ${
        candidates.length === 1 ? "produto sugerido" : "produtos sugeridos"
      }`,
      {
        description: `${formatNumber(suggestedPieces)} peças para 45 dias de cobertura, distribuídas nas variações com menos estoque.`,
      }
    );
  };

  const updateItem = (variantId: string, patch: Partial<DraftItem>) =>
    setItems((current) =>
      current.map((item) =>
        item.variantId === variantId ? { ...item, ...patch } : item
      )
    );

  const removeItem = (variantId: string) => {
    setItems((current) => current.filter((item) => item.variantId !== variantId));
    toast.success("Item removido do pedido.");
  };

  const handleSubmit = () => {
    const nextErrors: { supplier?: string; items?: string } = {};
    if (!supplierId) nextErrors.supplier = "Escolha o fornecedor do pedido.";
    const valid = items.filter((item) => item.quantity > 0 && item.unitCost > 0);
    if (valid.length === 0) {
      nextErrors.items =
        "Adicione ao menos um item com quantidade e custo maiores que zero.";
    }
    setErrors(nextErrors);
    if (nextErrors.supplier || nextErrors.items) {
      toast.error("Revise os campos destacados antes de salvar.");
      return;
    }

    setSaving(true);
    const supplier = state.suppliers.find((s) => s.id === supplierId);
    createPurchase({
      supplierId,
      installments,
      notes: notes.trim() ? notes.trim() : undefined,
      items: valid,
    });
    toast.success("Pedido de compra criado", {
      description: `${supplier?.name ?? "Fornecedor"} · ${formatBRL(
        total
      )} em ${installments}x. Receba o pedido para dar entrada no estoque.`,
    });
    router.push("/compras");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo pedido de compra"
        description="Monte o pedido por variação. O estoque e as duplicatas só são gerados quando o pedido for recebido."
        actions={
          <Button variant="outline" onClick={() => router.push("/compras")}>
            <ArrowLeft /> Voltar
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Fornecedor</CardTitle>
              <CardDescription>
                A busca de produtos usa o catálogo deste fornecedor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field
                label="Fornecedor"
                htmlFor="fornecedor"
                required
                error={errors.supplier}
              >
                <Select
                  value={supplierId}
                  onValueChange={(value) => {
                    setSupplierId(value);
                    setExpandedId(null);
                    setErrors((current) => ({ ...current, supplier: undefined }));
                  }}
                >
                  <SelectTrigger
                    id="fornecedor"
                    className="w-full"
                    aria-label="Fornecedor do pedido"
                  >
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

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  A sugestão usa o giro dos últimos 90 dias e completa 45 dias de
                  cobertura para os produtos com estoque curto.
                </p>
                <Button
                  variant="secondary"
                  onClick={suggestRestock}
                  className="shrink-0"
                >
                  <Sparkles /> Sugerir reposição
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar produtos</CardTitle>
              <CardDescription>
                Escolha o produto e informe a quantidade por cor e tamanho.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!supplierId ? (
                <EmptyState
                  icon={Truck}
                  title="Selecione o fornecedor"
                  description="Depois de escolher o fornecedor, os produtos dele aparecem aqui para busca."
                />
              ) : (
                <>
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar produto por nome, SKU ou categoria…"
                    aria-label="Buscar produtos do fornecedor"
                  />

                  {results.length === 0 ? (
                    <EmptyState
                      icon={Search}
                      title="Nenhum produto encontrado"
                      description="Este fornecedor não tem produtos ativos com esse termo."
                    />
                  ) : (
                    <ul className="divide-y rounded-xl border">
                      {results.map((product) => {
                        const variants = byProduct.get(product.id) ?? [];
                        const stock = variants.reduce(
                          (sum, v) => sum + v.stock,
                          0
                        );
                        const expanded = expandedId === product.id;
                        return (
                          <li key={product.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(expanded ? null : product.id)
                              }
                              aria-expanded={expanded}
                              className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary/50"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {product.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {product.category} · {product.sku} · custo{" "}
                                  {formatBRL(product.cost)}
                                </p>
                              </div>
                              <Badge
                                variant={stock === 0 ? "critical" : "secondary"}
                              >
                                {formatNumber(stock)} em estoque
                              </Badge>
                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground transition-transform",
                                  expanded && "rotate-180"
                                )}
                                aria-hidden
                              />
                            </button>

                            {expanded ? (
                              <div className="space-y-2 border-t bg-secondary/30 px-3 py-3">
                                {variants.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Este produto não tem variações cadastradas.
                                  </p>
                                ) : (
                                  <>
                                    {variants.map((variant) => (
                                      <div
                                        key={variant.id}
                                        className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_auto_auto]"
                                      >
                                        <div className="col-span-2 min-w-0 sm:col-span-1">
                                          <p className="truncate text-sm font-medium">
                                            {variant.color} · {variant.size}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Estoque atual:{" "}
                                            <span
                                              className={cn(
                                                "tabular-nums",
                                                variant.stock <= variant.minStock &&
                                                  "font-medium text-critical"
                                              )}
                                            >
                                              {formatNumber(variant.stock)}
                                            </span>{" "}
                                            · mínimo {formatNumber(variant.minStock)}
                                          </p>
                                        </div>
                                        <div className="space-y-1">
                                          <Label
                                            htmlFor={`qtd-${variant.id}`}
                                            className="text-xs"
                                          >
                                            Comprar
                                          </Label>
                                          <Input
                                            id={`qtd-${variant.id}`}
                                            type="number"
                                            min={0}
                                            inputMode="numeric"
                                            placeholder="0"
                                            className="w-full sm:w-24"
                                            value={drafts[variant.id]?.quantity ?? ""}
                                            onChange={(event) =>
                                              setDraft(variant.id, {
                                                quantity: event.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label
                                            htmlFor={`custo-${variant.id}`}
                                            className="text-xs"
                                          >
                                            Custo unit.
                                          </Label>
                                          <Input
                                            id={`custo-${variant.id}`}
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            inputMode="decimal"
                                            className="w-full sm:w-28"
                                            value={
                                              drafts[variant.id]?.cost ??
                                              String(product.cost)
                                            }
                                            onChange={(event) =>
                                              setDraft(variant.id, {
                                                cost: event.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    <Button
                                      size="sm"
                                      className="w-full sm:w-auto"
                                      onClick={() =>
                                        addProductVariants(product, variants)
                                      }
                                    >
                                      <PackagePlus /> Adicionar ao pedido
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itens do pedido</CardTitle>
              <CardDescription>
                {items.length === 0
                  ? "Nenhum item adicionado."
                  : `${formatNumber(items.length)} ${
                      items.length === 1 ? "item" : "itens"
                    } · ${formatNumber(pieces)} peças`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <EmptyState
                  icon={PackagePlus}
                  title="O pedido está vazio"
                  description="Adicione produtos pela busca acima ou use a sugestão de reposição."
                />
              ) : (
                <ul className="divide-y rounded-xl border">
                  {items.map((item) => {
                    const product = productById.get(item.productId);
                    const variant = variantById.get(item.variantId);
                    return (
                      <li
                        key={item.variantId}
                        className="grid grid-cols-2 items-end gap-2 px-3 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
                      >
                        <div className="col-span-2 min-w-0 sm:col-span-1">
                          <p className="truncate text-sm font-medium">
                            {product?.name ?? "Produto"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {variant
                              ? `${variant.color} · ${variant.size} · estoque ${formatNumber(
                                  variant.stock
                                )}`
                              : "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor={`item-qtd-${item.variantId}`}
                            className="text-xs"
                          >
                            Qtd
                          </Label>
                          <Input
                            id={`item-qtd-${item.variantId}`}
                            type="number"
                            min={1}
                            inputMode="numeric"
                            className="w-full sm:w-20"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.variantId, {
                                quantity: Math.max(
                                  0,
                                  Math.floor(Number(event.target.value) || 0)
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor={`item-custo-${item.variantId}`}
                            className="text-xs"
                          >
                            Custo unit.
                          </Label>
                          <Input
                            id={`item-custo-${item.variantId}`}
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className="w-full sm:w-28"
                            value={item.unitCost}
                            onChange={(event) =>
                              updateItem(item.variantId, {
                                unitCost: Math.max(
                                  0,
                                  Number(event.target.value) || 0
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Subtotal</p>
                          <p className="text-sm font-medium tabular-nums">
                            {formatBRL(item.unitCost * item.quantity)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remover ${product?.name ?? "item"} do pedido`}
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="text-critical" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {errors.items ? (
                <p className="text-xs text-destructive">{errors.items}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do pedido</CardTitle>
              <CardDescription>Confira antes de enviar ao fornecedor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Itens</dt>
                  <dd className="tabular-nums">{formatNumber(items.length)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Peças</dt>
                  <dd className="tabular-nums">{formatNumber(pieces)}</dd>
                </div>
                <Separator />
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="font-medium">Total do pedido</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {formatBRL(total)}
                  </dd>
                </div>
                {items.length > 0 ? (
                  <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <dt>Cada parcela</dt>
                    <dd className="tabular-nums">
                      {formatBRL(total / installments)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <Field label="Parcelas" htmlFor="parcelas" required>
                <Select
                  value={String(installments)}
                  onValueChange={(value) => setInstallments(Number(value))}
                >
                  <SelectTrigger
                    id="parcelas"
                    className="w-full"
                    aria-label="Número de parcelas"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTALLMENT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}x{option > 1 ? " (a cada 30 dias)" : " (à vista)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Observações"
                htmlFor="observacoes"
                hint="Prazo de entrega, condições combinadas, referência do pedido."
              >
                <Textarea
                  id="observacoes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex.: entrega até dia 20, frete por conta do fornecedor."
                />
              </Field>

              <div className="flex flex-col gap-2">
                <Button onClick={handleSubmit} disabled={saving}>
                  <Truck /> {saving ? "Salvando…" : "Salvar pedido"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/compras")}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
