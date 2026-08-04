"use client";

import { useState } from "react";
import { Copy, MessageCircle, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addInteraction } from "@/lib/store";
import type { CustomerStats } from "@/lib/metrics";
import { personalMessage } from "./segments";

/** Só os dígitos, com o DDI do Brasil — formato aceito pelo link do WhatsApp. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mensagem de WhatsApp já escrita para a cliente: usa o nome, o tamanho e a
 * categoria preferida para que a vendedora só precise revisar e enviar.
 */
export function CustomerMessageDialog({
  open,
  onOpenChange,
  stat,
  storeName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stat: CustomerStats | null;
  storeName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {stat ? (
        <DialogContent className="sm:max-w-md">
          <MessageBody
            stat={stat}
            storeName={storeName}
            onDone={() => onOpenChange(false)}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

/** O corpo monta a cada abertura — o texto sugerido nasce sempre atualizado. */
function MessageBody({
  stat,
  storeName,
  onDone,
}: {
  stat: CustomerStats;
  storeName: string;
  onDone: () => void;
}) {
  const [message, setMessage] = useState(() => personalMessage(stat, storeName));
  const [register, setRegister] = useState(true);

  const customer = stat.customer;
  const firstName = customer.name.split(" ")[0];

  const handleCopy = async () => {
    const ok = await copyText(message);
    if (!ok) {
      toast.error("Não foi possível copiar", {
        description: "Selecione o texto e copie manualmente.",
      });
      return;
    }
    if (register) {
      addInteraction({
        customerId: customer.id,
        type: "mensagem",
        note: message,
      });
      toast.success("Mensagem copiada e registrada no histórico", {
        description: `${customer.name} · agora é só colar no WhatsApp.`,
      });
    } else {
      toast.success("Mensagem copiada", {
        description: "Cole no WhatsApp da cliente.",
      });
    }
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enviar mensagem para {firstName}</DialogTitle>
        <DialogDescription>
          Texto sugerido a partir do histórico dela: tamanho{" "}
          {customer.preferredSize}
          {stat.favoriteCategory
            ? `, gosta de ${stat.favoriteCategory.toLowerCase()}`
            : ""}
          {stat.daysSinceLastPurchase !== null
            ? `, última compra há ${stat.daysSinceLastPurchase} dias`
            : ", ainda sem compras"}
          .
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="mensagem-cliente">Mensagem</Label>
        <Textarea
          id="mensagem-cliente"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-32"
        />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" /> Edite à vontade — o texto é só um ponto
          de partida.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <Label htmlFor="registrar-envio" className="text-sm font-normal">
          Registrar no histórico de atendimentos
        </Label>
        <Switch
          id="registrar-envio"
          checked={register}
          onCheckedChange={setRegister}
          aria-label="Registrar mensagem no histórico de atendimentos"
        />
      </div>

      {!customer.marketingConsent ? (
        <p className="rounded-lg bg-warning/15 p-3 text-xs text-foreground">
          Esta cliente <strong>não autorizou</strong> receber comunicações de
          marketing. Use este contato apenas para atendimento direto.
        </p>
      ) : null}

      <DialogFooter>
        <Button variant="outline" asChild>
          <a
            href={`https://wa.me/${whatsappNumber(customer.whatsapp || customer.phone)}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle /> Abrir no WhatsApp
          </a>
        </Button>
        <Button onClick={handleCopy}>
          <Copy /> Copiar mensagem
        </Button>
      </DialogFooter>
    </>
  );
}
