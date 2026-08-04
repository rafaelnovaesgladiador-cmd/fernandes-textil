"use client";

import { CircleAlert, Eraser, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/format";
import type {
  Customer,
  PaymentMethod,
  SalesChannel,
  Seller,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { CartList } from "./cart-list";
import { CustomerPicker } from "./customer-picker";
import { DiscountField } from "./discount-field";
import { PaymentFields } from "./payment-fields";
import {
  SaleTotalsSummary,
  type CartItem,
  type DiscountMode,
  type SaleTotals,
} from "./sale-totals";

/** Tudo o que a tela de nova venda guarda antes de chamar `createSale`. */
export interface SaleDraft {
  items: CartItem[];
  discountMode: DiscountMode;
  discountInput: string;
  customerId?: string;
  sellerId: string;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  installments: number;
  cashReceived: string;
  notes: string;
}

export interface SaleErrors {
  items?: string;
  seller?: string;
  customer?: string;
  cash?: string;
}

/**
 * Carrinho + fechamento da venda.
 *
 * O mesmo componente atende a coluna fixa do desktop e a gaveta do celular —
 * a vendedora vê sempre os itens, o total e o botão de finalizar.
 */
export function CheckoutPanel({
  idPrefix,
  draft,
  totals,
  customers,
  sellers,
  maxDiscountPercent,
  errors,
  onPatch,
  onQuantityChange,
  onRemoveItem,
  onClearCart,
  onSubmit,
  className,
}: {
  /** Prefixo dos ids dos campos — o painel aparece no desktop e na gaveta. */
  idPrefix: string;
  draft: SaleDraft;
  totals: SaleTotals;
  customers: Customer[];
  sellers: Seller[];
  maxDiscountPercent: number;
  errors: SaleErrors;
  onPatch: (patch: Partial<SaleDraft>) => void;
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onClearCart: () => void;
  onSubmit: () => void;
  className?: string;
}) {
  const count = draft.items.length;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="size-4" />
          Carrinho
          <span className="text-muted-foreground">
            ({count} {count === 1 ? "item" : "itens"})
          </span>
        </p>
        {count > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            className="h-9 text-muted-foreground hover:text-destructive"
          >
            <Eraser />
            Limpar
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <CartList
          items={draft.items}
          onQuantityChange={onQuantityChange}
          onRemove={onRemoveItem}
        />

        {count > 0 ? (
          <DiscountField
            id={`${idPrefix}-desconto`}
            mode={draft.discountMode}
            input={draft.discountInput}
            onModeChange={(discountMode) => onPatch({ discountMode })}
            onInputChange={(discountInput) => onPatch({ discountInput })}
            totals={totals}
            maxPercent={maxDiscountPercent}
          />
        ) : null}

        <CustomerPicker
          inputId={`${idPrefix}-cliente`}
          customers={customers}
          selectedId={draft.customerId}
          onSelect={(customerId) => onPatch({ customerId })}
          error={errors.customer}
          required={draft.paymentMethod === "crediario"}
        />

        <PaymentFields
          idPrefix={idPrefix}
          sellers={sellers}
          sellerId={draft.sellerId}
          onSellerChange={(sellerId) => onPatch({ sellerId })}
          sellerError={errors.seller}
          channel={draft.channel}
          onChannelChange={(channel) => onPatch({ channel })}
          paymentMethod={draft.paymentMethod}
          onPaymentMethodChange={(paymentMethod) =>
            onPatch({
              paymentMethod,
              // Crediário começa em 2x; as demais formas voltam para 1x.
              installments: paymentMethod === "crediario" ? 2 : 1,
              cashReceived: paymentMethod === "dinheiro" ? draft.cashReceived : "",
            })
          }
          installments={draft.installments}
          onInstallmentsChange={(installments) => onPatch({ installments })}
          cashReceived={draft.cashReceived}
          onCashReceivedChange={(cashReceived) => onPatch({ cashReceived })}
          cashError={errors.cash}
          total={totals.total}
        />

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-observacao`}>
            Observação
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id={`${idPrefix}-observacao`}
            value={draft.notes}
            onChange={(event) => onPatch({ notes: event.target.value })}
            placeholder="Ex.: peça reservada para retirada no sábado."
            className="min-h-16"
          />
        </div>
      </div>

      <div className="space-y-3 border-t bg-card px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <SaleTotalsSummary totals={totals} />

        {errors.items ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <CircleAlert className="mt-px size-3.5 shrink-0" />
            {errors.items}
          </p>
        ) : null}

        <Button
          type="button"
          onClick={onSubmit}
          className="h-12 w-full text-base"
        >
          Finalizar venda · {formatBRL(totals.total)}
        </Button>
      </div>
    </div>
  );
}
