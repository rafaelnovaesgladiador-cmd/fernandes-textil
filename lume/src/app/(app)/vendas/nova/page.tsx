"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleCheck, Plus, Receipt, Share2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useConfirm } from "@/components/confirm-dialog";
import { CartBar } from "@/components/vendas/cart-bar";
import {
  CheckoutPanel,
  type SaleDraft,
  type SaleErrors,
} from "@/components/vendas/checkout-panel";
import {
  ProductSearch,
  type ProductHit,
} from "@/components/vendas/product-search";
import {
  ReceiptView,
  ShareReceiptDialog,
  buildReceiptText,
  type ReceiptData,
} from "@/components/vendas/receipt";
import {
  computeSaleTotals,
  parseAmount,
  type CartItem,
} from "@/components/vendas/sale-totals";
import { VariantPickerDialog } from "@/components/vendas/variant-picker";
import { useStore } from "@/hooks/use-store";
import { DEMO_TODAY } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { variantsByProduct } from "@/lib/metrics";
import { createSale, getState } from "@/lib/store";
import type { Product, ProductVariant } from "@/lib/types";

const INITIAL_DRAFT: SaleDraft = {
  items: [],
  discountMode: "reais",
  discountInput: "",
  customerId: undefined,
  sellerId: "",
  channel: "loja",
  paymentMethod: "pix",
  installments: 1,
  cashReceived: "",
  notes: "",
};

/**
 * Nova venda — a tela do balcão.
 *
 * Duas colunas no desktop (busca à esquerda, carrinho fixo à direita) e uma
 * coluna no celular, com o carrinho sempre visível na barra inferior. Toda a
 * regra de estoque, financeiro e histórico fica em `createSale`.
 */
export default function NovaVendaPage() {
  const router = useRouter();
  const state = useStore();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<SaleDraft>(INITIAL_DRAFT);
  const [errors, setErrors] = useState<SaleErrors>({});
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<
    (ReceiptData & { saleId: string; whatsapp?: string }) | null
  >(null);
  const [shareOpen, setShareOpen] = useState(false);

  const byProduct = useMemo(() => variantsByProduct(state), [state]);
  const totals = useMemo(
    () => computeSaleTotals(draft.items, draft.discountMode, draft.discountInput),
    [draft.items, draft.discountMode, draft.discountInput]
  );

  /** Quantidade já reservada no carrinho, por variação. */
  const inCart = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of draft.items) map[item.variantId] = item.quantity;
    return map;
  }, [draft.items]);

  const results = useMemo<ProductHit[]>(() => {
    const term = query.trim().toLowerCase();
    if (term.length === 0) return [];
    const hits: ProductHit[] = [];

    for (const product of state.products) {
      if (product.status !== "ativo") continue;
      const variants = byProduct.get(product.id) ?? [];
      const matches =
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.barcode.includes(term) ||
        product.category.toLowerCase().includes(term) ||
        variants.some(
          (variant) =>
            variant.sku.toLowerCase().includes(term) ||
            variant.barcode.includes(term)
        );
      if (!matches) continue;

      hits.push({
        product,
        price: product.promoPrice ?? product.price,
        stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
        colors: [
          ...new Set(variants.filter((v) => v.stock > 0).map((v) => v.color)),
        ],
      });
    }

    return hits
      .sort((a, b) => {
        if ((a.stock > 0) !== (b.stock > 0)) return a.stock > 0 ? -1 : 1;
        return a.product.name.localeCompare(b.product.name, "pt-BR");
      })
      .slice(0, 12);
  }, [query, state.products, byProduct]);

  const patch = (values: Partial<SaleDraft>) => {
    setDraft((current) => ({ ...current, ...values }));
    setErrors((current) => ({
      ...current,
      seller: values.sellerId ? undefined : current.seller,
      customer:
        values.customerId || values.paymentMethod ? undefined : current.customer,
      cash: values.cashReceived !== undefined ? undefined : current.cash,
    }));
  };

  const addVariant = (variant: ProductVariant, quantity: number) => {
    const product = state.products.find((p) => p.id === variant.productId);
    if (!product) return;

    const existing = draft.items.find((item) => item.variantId === variant.id);
    const current = existing?.quantity ?? 0;
    const next = Math.min(current + quantity, variant.stock);

    if (next === current) {
      toast.error("Estoque insuficiente", {
        description: `Restam ${variant.stock} ${
          variant.stock === 1 ? "peça" : "peças"
        } de ${product.name} ${variant.color} tamanho ${variant.size}.`,
      });
      return;
    }

    const price = product.promoPrice ?? product.price;
    const item: CartItem = {
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      unitPrice: price,
      unitCost: product.cost,
      quantity: next,
      stock: variant.stock,
    };

    setDraft((currentDraft) => ({
      ...currentDraft,
      items: existing
        ? currentDraft.items.map((row) =>
            row.variantId === variant.id ? item : row
          )
        : [...currentDraft.items, item],
    }));
    setErrors((currentErrors) => ({ ...currentErrors, items: undefined }));

    toast.success(`${product.name} no carrinho`, {
      description: `${variant.color} · Tam. ${variant.size} · ${formatBRL(price)}`,
    });
  };

  /** O leitor de código de barras "digita" o código: casou, entra direto. */
  const handleQueryChange = (value: string) => {
    const term = value.trim();
    if (term.length >= 6) {
      const variant = state.variants.find((v) => v.barcode === term);
      if (variant) {
        addVariant(variant, 1);
        setQuery("");
        return;
      }
    }
    setQuery(value);
  };

  const changeQuantity = (variantId: string, quantity: number) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity: Math.max(1, Math.min(quantity, item.stock)),
            }
          : item
      ),
    }));
  };

  const removeItem = (variantId: string) => {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.variantId !== variantId),
    }));
  };

  const clearCart = () =>
    confirm({
      title: "Limpar o carrinho?",
      description:
        "As peças adicionadas serão removidas. Cliente, vendedora e pagamento continuam como estão.",
      confirmLabel: "Limpar carrinho",
      destructive: true,
      onConfirm: () =>
        setDraft((current) => ({ ...current, items: [], discountInput: "" })),
    });

  const startNewSale = () => {
    setDraft(INITIAL_DRAFT);
    setErrors({});
    setQuery("");
    setReceipt(null);
    setShareOpen(false);
    setCartOpen(false);
  };

  const finish = () => {
    const nextErrors: SaleErrors = {};

    if (draft.items.length === 0) {
      nextErrors.items =
        "Adicione ao menos uma peça ao carrinho para finalizar a venda.";
    }
    if (!draft.sellerId) {
      nextErrors.seller = "Escolha quem fez o atendimento para registrar a venda.";
    }
    if (draft.paymentMethod === "crediario" && !draft.customerId) {
      nextErrors.customer =
        "O crediário precisa de uma cliente cadastrada. Busque pelo nome ou telefone, ou escolha outra forma de pagamento.";
    }
    const received = parseAmount(draft.cashReceived);
    if (
      draft.paymentMethod === "dinheiro" &&
      draft.cashReceived.trim().length > 0 &&
      received < totals.total
    ) {
      nextErrors.cash = `O valor recebido é menor que o total. Informe ao menos ${formatBRL(
        totals.total
      )} ou apague o campo.`;
    }

    setErrors(nextErrors);
    const firstError = Object.values(nextErrors).find(Boolean);
    if (firstError) {
      // No celular o carrinho está fechado: abre para mostrar o que falta.
      const wideScreen =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      if (!wideScreen) setCartOpen(true);
      toast.error("Falta um passo para finalizar", { description: firstError });
      return;
    }

    const installments =
      draft.paymentMethod === "credito" || draft.paymentMethod === "crediario"
        ? draft.installments
        : 1;

    const result = createSale({
      items: draft.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
      })),
      customerId: draft.customerId,
      sellerId: draft.sellerId,
      channel: draft.channel,
      paymentMethod: draft.paymentMethod,
      installments,
      discount: totals.discount,
      notes: draft.notes.trim() || undefined,
    });

    if (!result.ok || !result.saleId || !result.code) {
      toast.error("Não foi possível finalizar a venda", {
        description:
          result.error ??
          "Revise os itens do carrinho e tente novamente em instantes.",
      });
      return;
    }

    const fresh = getState().sales.find((sale) => sale.id === result.saleId);
    const customer = state.customers.find((c) => c.id === draft.customerId);
    const seller = state.sellers.find((s) => s.id === draft.sellerId);
    const change =
      draft.paymentMethod === "dinheiro" && received > 0
        ? Math.round((received - totals.total) * 100) / 100
        : undefined;

    setCartOpen(false);
    setReceipt({
      saleId: result.saleId,
      whatsapp: customer?.whatsapp,
      code: result.code,
      date: fresh?.date ?? DEMO_TODAY.toISOString(),
      storeName: state.company.tradeName,
      items: draft.items.map((item) => ({
        name: item.name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal: totals.gross,
      discount: totals.discount,
      total: totals.total,
      paymentMethod: draft.paymentMethod,
      installments,
      change,
      sellerName: seller?.name ?? "—",
      customerName: customer?.name,
      channel: draft.channel,
      notes: draft.notes.trim() || undefined,
    });

    toast.success(`Venda ${result.code} registrada`, {
      description: "Estoque atualizado e comprovante pronto para enviar.",
    });
  };

  const checkoutProps = {
    draft,
    totals,
    customers: state.customers,
    sellers: state.sellers,
    maxDiscountPercent: state.settings.maxDiscountPercent,
    errors,
    onPatch: patch,
    onQuantityChange: changeQuantity,
    onRemoveItem: removeItem,
    onClearCart: clearCart,
    onSubmit: finish,
  };

  return (
    <div className="space-y-5 pb-28 lg:pb-0">
      <PageHeader
        title="Nova venda"
        description="Busque a peça, confira o carrinho e finalize — o estoque e o financeiro são atualizados na hora."
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/vendas")}>
            <ArrowLeft />
            Histórico
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
        <ProductSearch
          query={query}
          onQueryChange={handleQueryChange}
          results={results}
          onSelect={(hit) => setPickerProduct(hit.product)}
        />

        {/* Desktop: carrinho fixo ao lado da busca */}
        <div className="hidden lg:block">
          <div className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
            <CheckoutPanel idPrefix="venda-desktop" {...checkoutProps} />
          </div>
        </div>
      </div>

      {/* Celular: barra fixa + gaveta com o fechamento completo */}
      <CartBar
        count={totals.pieces}
        total={totals.total}
        onOpen={() => setCartOpen(true)}
        onSubmit={finish}
      />

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[92dvh] gap-0 p-0">
          <SheetHeader className="border-b py-3">
            <SheetTitle>Carrinho e pagamento</SheetTitle>
          </SheetHeader>
          <CheckoutPanel
            idPrefix="venda-mobile"
            {...checkoutProps}
            className="min-h-0 flex-1"
          />
        </SheetContent>
      </Sheet>

      <VariantPickerDialog
        product={pickerProduct}
        variants={pickerProduct ? byProduct.get(pickerProduct.id) ?? [] : []}
        inCart={inCart}
        open={pickerProduct !== null}
        onOpenChange={(open) => {
          if (!open) setPickerProduct(null);
        }}
        onConfirm={addVariant}
      />

      {/* Comprovante da venda registrada */}
      <Dialog
        open={receipt !== null}
        onOpenChange={(open) => {
          if (!open) startNewSale();
        }}
      >
        <DialogContent className="max-h-[92dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success-text">
              <CircleCheck className="size-5" />
              Venda {receipt?.code} finalizada
            </DialogTitle>
            <DialogDescription>
              Estoque baixado, comissão e financeiro atualizados.
            </DialogDescription>
          </DialogHeader>

          {receipt ? <ReceiptView data={receipt} /> : null}

          <div className="grid gap-2">
            <Button className="h-11 w-full" onClick={() => setShareOpen(true)}>
              <Share2 />
              Compartilhar no WhatsApp
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11"
                onClick={() =>
                  receipt ? router.push(`/vendas/${receipt.saleId}`) : undefined
                }
              >
                <Receipt />
                Ver venda
              </Button>
              <Button variant="secondary" className="h-11" onClick={startNewSale}>
                <Plus />
                Nova venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShareReceiptDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        whatsapp={receipt?.whatsapp}
        text={receipt ? buildReceiptText(receipt) : ""}
      />

      {confirmDialog}
    </div>
  );
}
