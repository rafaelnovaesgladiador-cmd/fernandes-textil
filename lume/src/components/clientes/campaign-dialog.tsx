"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign } from "@/lib/store";
import { formatNumber } from "@/lib/format";
import type { CustomerStats } from "@/lib/metrics";
import type { CampaignChannel } from "@/lib/types";
import {
  matchesSegment,
  SEGMENT_BY_KEY,
  SEGMENTS,
  suggestedCampaignMessage,
  type SegmentKey,
} from "./segments";

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram (direct)",
  email: "E-mail",
};

/**
 * Campanha por segmento. O público sai da mesma régua dos chips da lista e só
 * conta quem autorizou receber comunicações — LGPD não é detalhe de rodapé.
 */
export function CampaignDialog({
  open,
  onOpenChange,
  stats,
  initialSegment,
  storeName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: CustomerStats[];
  initialSegment: SegmentKey;
  storeName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <CampaignBody
          stats={stats}
          initialSegment={initialSegment}
          storeName={storeName}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CampaignBody({
  stats,
  initialSegment,
  storeName,
  onDone,
}: {
  stats: CustomerStats[];
  initialSegment: SegmentKey;
  storeName: string;
  onDone: () => void;
}) {
  const [segment, setSegment] = useState<SegmentKey>(initialSegment);
  const [name, setName] = useState(
    `${SEGMENT_BY_KEY[initialSegment].label} · coleção nova`
  );
  const [channel, setChannel] = useState<CampaignChannel>("whatsapp");
  const [message, setMessage] = useState(() =>
    suggestedCampaignMessage(initialSegment, storeName)
  );
  const [edited, setEdited] = useState(false);

  const changeSegment = (key: SegmentKey) => {
    setSegment(key);
    if (!edited) setMessage(suggestedCampaignMessage(key, storeName));
  };

  const audience = stats.filter((stat) => matchesSegment(stat, segment));
  const recipients = audience.filter(
    (stat) => stat.customer.marketingConsent
  ).length;
  const withoutConsent = audience.length - recipients;

  const submit = () => {
    if (name.trim().length < 3) {
      toast.error("Dê um nome à campanha para reconhecê-la depois.");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Escreva a mensagem que será enviada.");
      return;
    }
    if (recipients === 0) {
      toast.error("Nenhuma cliente deste segmento autorizou receber mensagens.");
      return;
    }
    createCampaign({
      name: name.trim(),
      segment: SEGMENT_BY_KEY[segment].label,
      channel,
      message: message.trim(),
      recipients,
    });
    toast.success(`Campanha enviada para ${formatNumber(recipients)} clientes`, {
      description: `${SEGMENT_BY_KEY[segment].label} · ${CHANNEL_LABELS[channel]}`,
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Criar campanha</DialogTitle>
        <DialogDescription>
          Uma mensagem para um grupo de clientes. Escolha o segmento e revise o
          texto antes de disparar.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="campanha-nome">Nome da campanha</Label>
        <Input
          id="campanha-nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Reativação de agosto"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="campanha-segmento">Segmento alvo</Label>
          <Select
            value={segment}
            onValueChange={(v) => changeSegment(v as SegmentKey)}
          >
            <SelectTrigger id="campanha-segmento" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEGMENTS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label} ·{" "}
                  {formatNumber(
                    stats.filter((stat) => matchesSegment(stat, item.key)).length
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campanha-canal">Canal</Label>
          <Select
            value={channel}
            onValueChange={(v) => setChannel(v as CampaignChannel)}
          >
            <SelectTrigger id="campanha-canal" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHANNEL_LABELS) as CampaignChannel[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {CHANNEL_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg bg-secondary/60 p-3 text-xs">
        <p className="text-sm font-medium">
          {formatNumber(recipients)}{" "}
          {recipients === 1 ? "cliente será atingida" : "clientes serão atingidas"}
        </p>
        <p className="mt-1 text-muted-foreground">
          {SEGMENT_BY_KEY[segment].description}
          {withoutConsent > 0 ? (
            <>
              {" "}
              {formatNumber(withoutConsent)}{" "}
              {withoutConsent === 1 ? "cliente ficou" : "clientes ficaram"} de fora
              por não ter consentimento de comunicação (LGPD).
            </>
          ) : null}
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="campanha-mensagem">Mensagem</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setMessage(suggestedCampaignMessage(segment, storeName));
              setEdited(false);
            }}
          >
            <Sparkles /> Usar sugestão
          </Button>
        </div>
        <Textarea
          id="campanha-mensagem"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setEdited(true);
          }}
          className="min-h-28"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={submit}>
          <Send /> Enviar campanha
        </Button>
      </DialogFooter>
    </>
  );
}
