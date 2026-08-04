"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addInteraction } from "@/lib/store";
import type { Customer, CustomerInteraction } from "@/lib/types";

export type InteractionType = CustomerInteraction["type"];

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  mensagem: "Mensagem",
  ligacao: "Ligação",
  atendimento: "Atendimento na loja",
  lembrete: "Lembrete",
  cupom: "Cupom",
};

const PLACEHOLDERS: Record<InteractionType, string> = {
  mensagem: "Ex.: mandei as fotos dos vestidos novos no tamanho M.",
  ligacao: "Ex.: liguei para avisar da coleção; pediu para chamar no WhatsApp.",
  atendimento: "Ex.: veio à loja, provou 3 peças e levou uma calça de alfaiataria.",
  lembrete: "Ex.: chamar dia 20 para lembrar da peça separada.",
  cupom: "Ex.: entregou cupom de 10% válido até o fim do mês.",
};

/**
 * Registro de contato com a cliente — o mesmo diálogo atende "registrar
 * atendimento" e "criar lembrete", mudando apenas o tipo inicial.
 */
export function InteractionDialog({
  open,
  onOpenChange,
  customer,
  defaultType = "atendimento",
  title = "Registrar contato",
  description = "Tudo que for registrado aqui aparece na linha do tempo da cliente.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  defaultType?: InteractionType;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {customer ? (
        <DialogContent className="sm:max-w-md">
          <InteractionBody
            customer={customer}
            defaultType={defaultType}
            title={title}
            description={description}
            onDone={() => onOpenChange(false)}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function InteractionBody({
  customer,
  defaultType,
  title,
  description,
  onDone,
}: {
  customer: Customer;
  defaultType: InteractionType;
  title: string;
  description: string;
  onDone: () => void;
}) {
  const [type, setType] = useState<InteractionType>(defaultType);
  const [note, setNote] = useState("");

  const submit = () => {
    if (note.trim().length < 3) {
      toast.error("Escreva uma nota curta sobre o contato.");
      return;
    }
    addInteraction({ customerId: customer.id, type, note: note.trim() });
    toast.success(`${INTERACTION_LABELS[type]} registrada`, {
      description: `${customer.name} · histórico atualizado.`,
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {title} — {customer.name.split(" ")[0]}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="tipo-contato">Tipo de contato</Label>
        <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
          <SelectTrigger id="tipo-contato" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(INTERACTION_LABELS) as InteractionType[]).map((key) => (
              <SelectItem key={key} value={key}>
                {INTERACTION_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nota-contato">Nota</Label>
        <Textarea
          id="nota-contato"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={PLACEHOLDERS[type]}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={submit}>Registrar</Button>
      </DialogFooter>
    </>
  );
}
