"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL, formatDateTime } from "@/lib/format";
import {
  CHANNEL_LABELS,
  PAYMENT_LABELS,
  type PaymentMethod,
  type SalesChannel,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ReceiptItem {
  name: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

/** Dados congelados da venda registrada — base do comprovante e do texto. */
export interface ReceiptData {
  code: string;
  date: string;
  storeName: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  installments: number;
  /** Troco, quando a venda foi em dinheiro. */
  change?: number;
  sellerName: string;
  customerName?: string;
  channel: SalesChannel;
  notes?: string;
}

export function paymentSummary(
  method: PaymentMethod,
  installments: number
): string {
  const label = PAYMENT_LABELS[method];
  if (method === "crediario") return `${label} em ${installments}x`;
  if (method === "credito" && installments > 1)
    return `${label} em ${installments}x`;
  return label;
}

/** Texto do comprovante para colar no WhatsApp. */
export function buildReceiptText(data: ReceiptData): string {
  const lines: string[] = [
    `*${data.storeName}* — Comprovante de venda`,
    `Venda ${data.code} · ${formatDateTime(data.date)}`,
    "",
  ];

  for (const item of data.items) {
    lines.push(
      `${item.quantity}x ${item.name} (${item.color} · ${item.size}) — ${formatBRL(
        item.unitPrice * item.quantity
      )}`
    );
  }

  lines.push("");
  lines.push(`Subtotal: ${formatBRL(data.subtotal)}`);
  if (data.discount > 0) lines.push(`Desconto: -${formatBRL(data.discount)}`);
  lines.push(`*Total: ${formatBRL(data.total)}*`);
  lines.push(
    `Pagamento: ${paymentSummary(data.paymentMethod, data.installments)}`
  );
  if (data.change !== undefined && data.change > 0)
    lines.push(`Troco: ${formatBRL(data.change)}`);
  if (data.customerName) lines.push(`Cliente: ${data.customerName}`);
  lines.push(`Vendedora: ${data.sellerName}`);
  if (data.notes) lines.push(`Obs.: ${data.notes}`);
  lines.push("");
  lines.push("Obrigada pela preferência! 💗");

  return lines.join("\n");
}

/** Comprovante visual — usado na finalização e no detalhe da venda. */
export function ReceiptView({
  data,
  className,
}: {
  data: ReceiptData;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-secondary/30 p-4", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{data.storeName}</p>
        <p className="text-sm font-semibold tabular-nums">{data.code}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDateTime(data.date)} · {CHANNEL_LABELS[data.channel]}
      </p>

      <ul className="mt-3 space-y-1.5 border-t pt-3 text-sm">
        {data.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
            <span className="min-w-0">
              <span className="font-medium">{item.quantity}x</span> {item.name}
              <span className="block text-xs text-muted-foreground">
                {item.color} · Tam. {item.size} · {formatBRL(item.unitPrice)} un
              </span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatBRL(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatBRL(data.subtotal)}</dd>
        </div>
        {data.discount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Desconto</dt>
            <dd className="tabular-nums text-critical">
              − {formatBRL(data.discount)}
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between border-t pt-1.5">
          <dt className="font-medium">Total</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatBRL(data.total)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Pagamento</dt>
          <dd>{paymentSummary(data.paymentMethod, data.installments)}</dd>
        </div>
        {data.change !== undefined && data.change > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Troco</dt>
            <dd className="font-medium tabular-nums text-success-text">
              {formatBRL(data.change)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Vendedora</dt>
          <dd>{data.sellerName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Cliente</dt>
          <dd>{data.customerName ?? "Sem cliente identificado"}</dd>
        </div>
      </dl>

      {data.notes ? (
        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
          Obs.: {data.notes}
        </p>
      ) : null}
    </div>
  );
}

/** Texto pronto para copiar e mandar no WhatsApp. */
export function ShareReceiptDialog({
  open,
  onOpenChange,
  text,
  whatsapp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  /** Telefone da cliente, só dígitos com DDI — habilita o atalho do WhatsApp. */
  whatsapp?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Comprovante copiado", {
        description: "Cole na conversa do WhatsApp da cliente.",
      });
    } catch {
      toast.error("Não foi possível copiar", {
        description: "Selecione o texto e copie manualmente.",
      });
    }
  };

  const link = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar no WhatsApp</DialogTitle>
          <DialogDescription>
            Copie o texto abaixo e envie para a cliente.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          readOnly
          value={text}
          aria-label="Texto do comprovante"
          className="min-h-56 font-mono text-xs"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <Check />
            Fechar
          </Button>
          {link ? (
            <Button variant="secondary" asChild>
              <a href={link} target="_blank" rel="noreferrer">
                <MessageCircle />
                Abrir WhatsApp
              </a>
            </Button>
          ) : null}
          <Button onClick={copy}>
            <Copy />
            Copiar texto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
