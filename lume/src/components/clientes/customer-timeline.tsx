"use client";

import { useState } from "react";
import {
  BellRing,
  History,
  MessageCircle,
  NotebookPen,
  Phone,
  Store,
  TicketPercent,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { addInteraction } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import type { Customer, CustomerInteraction } from "@/lib/types";
import { INTERACTION_LABELS, type InteractionType } from "./interaction-dialog";

const TYPE_ICON: Record<InteractionType, LucideIcon> = {
  mensagem: MessageCircle,
  ligacao: Phone,
  atendimento: Store,
  lembrete: BellRing,
  cupom: TicketPercent,
};

/**
 * Linha do tempo de atendimentos + registro rápido de um novo contato.
 * É o histórico que evita a loja repetir a mesma abordagem duas vezes.
 */
export function CustomerTimeline({
  customer,
  interactions,
}: {
  customer: Customer;
  interactions: CustomerInteraction[];
}) {
  const [type, setType] = useState<InteractionType>("atendimento");
  const [note, setNote] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (note.trim().length < 3) {
      toast.error("Escreva uma nota curta sobre o contato.");
      return;
    }
    addInteraction({ customerId: customer.id, type, note: note.trim() });
    setNote("");
    toast.success(`${INTERACTION_LABELS[type]} registrada`, {
      description: "O contato entrou na linha do tempo da cliente.",
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="h-fit lg:col-span-1">
        <CardHeader>
          <CardTitle>Registrar contato</CardTitle>
          <CardDescription>
            Anote o que foi combinado — a próxima conversa começa daqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="timeline-tipo">Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as InteractionType)}
              >
                <SelectTrigger id="timeline-tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTERACTION_LABELS) as InteractionType[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {INTERACTION_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timeline-nota">Nota</Label>
              <Textarea
                id="timeline-nota"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: separei duas blusas tamanho M; ela passa sábado."
              />
            </div>
            <Button type="submit" className="w-full">
              <NotebookPen /> Registrar contato
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Linha do tempo</CardTitle>
          <CardDescription>
            {interactions.length > 0
              ? `${interactions.length} ${interactions.length === 1 ? "contato registrado" : "contatos registrados"} com esta cliente.`
              : "Nada registrado até agora."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nenhum atendimento registrado"
              description="Mensagens, ligações, cupons e lembretes registrados aqui viram o histórico da cliente."
            />
          ) : (
            <ol className="space-y-4">
              {interactions.map((interaction) => {
                const Icon = TYPE_ICON[interaction.type];
                return (
                  <li key={interaction.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                        {INTERACTION_LABELS[interaction.type]}
                        <span className="text-xs font-normal text-muted-foreground">
                          {formatDateTime(interaction.date)} · {interaction.userName}
                        </span>
                      </p>
                      <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">
                        {interaction.note}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
