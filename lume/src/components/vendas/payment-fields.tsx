"use client";

import {
  Banknote,
  Camera,
  CalendarClock,
  CreditCard,
  MessageCircle,
  QrCode,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import {
  CHANNEL_LABELS,
  PAYMENT_LABELS,
  type PaymentMethod,
  type SalesChannel,
  type Seller,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseAmount } from "./sale-totals";

const CHANNEL_ICONS: Record<SalesChannel, LucideIcon> = {
  loja: Store,
  whatsapp: MessageCircle,
  instagram: Camera,
};

const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  pix: QrCode,
  credito: CreditCard,
  debito: CreditCard,
  dinheiro: Banknote,
  crediario: CalendarClock,
};

const SHORT_PAYMENT: Record<PaymentMethod, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
  crediario: "Crediário",
};

export function PaymentFields({
  idPrefix,
  sellers,
  sellerId,
  onSellerChange,
  sellerError,
  channel,
  onChannelChange,
  paymentMethod,
  onPaymentMethodChange,
  installments,
  onInstallmentsChange,
  cashReceived,
  onCashReceivedChange,
  cashError,
  total,
}: {
  /** Prefixo dos ids — o carrinho é renderizado duas vezes (desktop e gaveta). */
  idPrefix: string;
  sellers: Seller[];
  sellerId: string;
  onSellerChange: (sellerId: string) => void;
  sellerError?: string;
  channel: SalesChannel;
  onChannelChange: (channel: SalesChannel) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  installments: number;
  onInstallmentsChange: (installments: number) => void;
  cashReceived: string;
  onCashReceivedChange: (value: string) => void;
  cashError?: string;
  total: number;
}) {
  const received = parseAmount(cashReceived);
  const change = received - total;
  const installmentOptions =
    paymentMethod === "crediario" ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-4">
      {/* Vendedora */}
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-vendedora`}>Vendedora</Label>
        <Select value={sellerId} onValueChange={onSellerChange}>
          <SelectTrigger
            id={`${idPrefix}-vendedora`}
            aria-invalid={sellerError ? true : undefined}
            className={cn(
              "h-11 w-full lg:h-9",
              sellerError && "border-destructive ring-2 ring-destructive/20"
            )}
          >
            <SelectValue placeholder="Quem está atendendo?" />
          </SelectTrigger>
          <SelectContent>
            {sellers.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>
                {seller.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sellerError ? (
          <p className="text-xs text-destructive">{sellerError}</p>
        ) : null}
      </div>

      {/* Canal */}
      <div className="space-y-1.5">
        <Label id={`${idPrefix}-canal-label`}>Canal da venda</Label>
        <div
          role="group"
          aria-labelledby={`${idPrefix}-canal-label`}
          className="grid grid-cols-3 gap-2"
        >
          {(Object.keys(CHANNEL_LABELS) as SalesChannel[]).map((option) => {
            const Icon = CHANNEL_ICONS[option];
            const active = channel === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onChannelChange(option)}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-accent text-accent-foreground ring-2 ring-primary/25"
                    : "hover:border-primary/40 hover:bg-secondary"
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{CHANNEL_LABELS[option]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Forma de pagamento */}
      <div className="space-y-1.5">
        <Label id={`${idPrefix}-pagamento-label`}>Forma de pagamento</Label>
        <div
          role="group"
          aria-labelledby={`${idPrefix}-pagamento-label`}
          className="grid grid-cols-3 gap-2"
        >
          {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((option) => {
            const Icon = PAYMENT_ICONS[option];
            const active = paymentMethod === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                aria-label={PAYMENT_LABELS[option]}
                onClick={() => onPaymentMethodChange(option)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-accent text-accent-foreground ring-2 ring-primary/25"
                    : "hover:border-primary/40 hover:bg-secondary"
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{SHORT_PAYMENT[option]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parcelas */}
      {paymentMethod === "credito" || paymentMethod === "crediario" ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-parcelas`}>
            {paymentMethod === "crediario"
              ? "Parcelas do crediário"
              : "Parcelas no crédito"}
          </Label>
          <Select
            value={String(installments)}
            onValueChange={(value) => onInstallmentsChange(Number(value))}
          >
            <SelectTrigger id={`${idPrefix}-parcelas`} className="h-11 w-full lg:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {installmentOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}x de {formatBRL(total > 0 ? total / option : 0)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {paymentMethod === "crediario" ? (
            <p className="text-xs text-muted-foreground">
              As parcelas entram no contas a receber, com vencimento a cada 30
              dias.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Dinheiro: troco */}
      {paymentMethod === "dinheiro" ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-valor-recebido`}>
            Valor recebido
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id={`${idPrefix}-valor-recebido`}
            value={cashReceived}
            inputMode="decimal"
            placeholder={formatBRL(total).replace("R$", "").trim()}
            onChange={(event) => onCashReceivedChange(event.target.value)}
            aria-invalid={cashError ? true : undefined}
            className="h-11 tabular-nums lg:h-9"
          />
          {cashError ? (
            <p className="text-xs text-destructive">{cashError}</p>
          ) : received > 0 ? (
            <div
              className={cn(
                "flex items-baseline justify-between rounded-lg px-3 py-2",
                change >= 0
                  ? "bg-success/12 text-success-text"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              <span className="text-sm font-medium">
                {change >= 0 ? "Troco" : "Falta receber"}
              </span>
              <span className="text-xl font-semibold tabular-nums">
                {formatBRL(Math.abs(change))}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Informe quanto a cliente entregou para calcular o troco.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
