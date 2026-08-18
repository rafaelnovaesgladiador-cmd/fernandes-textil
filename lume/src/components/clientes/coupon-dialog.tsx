"use client";

import { useState } from "react";
import { TicketPercent } from "lucide-react";
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
import { addInteraction } from "@/lib/store";
import { addDays, DEMO_TODAY } from "@/lib/dates";
import { formatBRL, formatDate } from "@/lib/format";
import type { CustomerStats } from "@/lib/metrics";
import { copyText } from "./customer-message-dialog";

const DISCOUNTS = ["5", "10", "15", "20"];
const VALIDITY = [
  { value: "7", label: "7 dias" },
  { value: "15", label: "15 dias" },
  { value: "30", label: "30 dias" },
];

/** Código legível e único o bastante para o balcão: LUME-MAR-10-0142. */
function couponCode(name: string, percent: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase();
  const seed = Math.abs(
    [...name].reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7) % 10000
  );
  return `LUME-${slug}-${percent}-${String(seed).padStart(4, "0")}`;
}

/**
 * Cupom individual: gera o código, mostra o custo estimado do desconto sobre o
 * ticket médio da cliente e deixa o registro no histórico.
 */
export function CouponDialog({
  open,
  onOpenChange,
  stat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stat: CustomerStats | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {stat ? (
        <DialogContent className="sm:max-w-md">
          <CouponBody stat={stat} onDone={() => onOpenChange(false)} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function CouponBody({
  stat,
  onDone,
}: {
  stat: CustomerStats;
  onDone: () => void;
}) {
  const [percent, setPercent] = useState("10");
  const [days, setDays] = useState("15");

  const code = couponCode(stat.customer.name, percent);
  const expiresAt = addDays(DEMO_TODAY, Number(days));
  const estimatedCost = (stat.ticket * Number(percent)) / 100;

  const generate = async () => {
    const note = `Cupom ${code} — ${percent}% de desconto, válido até ${formatDate(expiresAt)}.`;
    addInteraction({ customerId: stat.customer.id, type: "cupom", note });
    const copied = await copyText(code);
    toast.success("Cupom gerado e registrado", {
      description: copied
        ? `${code} copiado para a área de transferência.`
        : `Código ${code}. Anote para informar no caixa.`,
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Oferecer cupom para {stat.customer.name.split(" ")[0]}
        </DialogTitle>
        <DialogDescription>
          O cupom fica registrado no histórico da cliente e pode ser informado no
          caixa na hora da venda.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cupom-percentual">Desconto</Label>
          <Select value={percent} onValueChange={setPercent}>
            <SelectTrigger id="cupom-percentual" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISCOUNTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cupom-validade">Validade</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger id="cupom-validade" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALIDITY.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-dashed p-3 text-center">
        <p className="text-xs text-muted-foreground">Código do cupom</p>
        <p className="mt-1 font-mono text-lg font-semibold tracking-wide">{code}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Válido até {formatDate(expiresAt)}
        </p>
      </div>

      <p className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
        {stat.ticket > 0 ? (
          <>
            No ticket médio dela ({formatBRL(stat.ticket)}), esse desconto custa
            cerca de{" "}
            <span className="font-medium text-foreground">
              {formatBRL(estimatedCost)}
            </span>{" "}
            por compra. Vale quando traz de volta quem estava parada — não como
            hábito.
          </>
        ) : (
          <>
            Ela ainda não comprou: o cupom aqui serve para trazer a primeira visita
            à loja.
          </>
        )}
      </p>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={generate}>
          <TicketPercent /> Gerar cupom
        </Button>
      </DialogFooter>
    </>
  );
}
