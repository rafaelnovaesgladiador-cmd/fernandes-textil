"use client";

import { useState } from "react";
import { EyeOff, LockKeyhole } from "lucide-react";
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
import { Field } from "@/components/form-field";
import { formatBRL } from "@/lib/format";
import { closeCashSession } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  DIFFERENCE_LABELS,
  differenceTone,
  isValidAmount,
  parseAmount,
} from "./cash-helpers";

/**
 * Conferência cega: o operador digita o que contou sem ver o esperado.
 * Só depois o sistema mostra a comparação — é assim que a diferença aparece
 * de verdade, em vez de ser "ajustada" para bater.
 */
export function CloseCashDialog({
  open,
  onOpenChange,
  expected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expected: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Ao fechar, o conteúdo desmonta e a conferência recomeça do zero. */}
      <DialogContent>
        <CloseCashFlow expected={expected} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CloseCashFlow({
  expected,
  onDone,
}: {
  expected: number;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"contagem" | "resultado">("contagem");
  const [counted, setCounted] = useState("");
  const [error, setError] = useState<string | null>(null);

  const countedValue = parseAmount(counted);
  const difference = Number.isFinite(countedValue) ? countedValue - expected : 0;
  const tone = differenceTone(difference);

  const check = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidAmount(counted, { allowZero: true })) {
      setError("Informe o valor contado (pode ser 0).");
      return;
    }
    setError(null);
    setStep("resultado");
  };

  const confirm = () => {
    closeCashSession(countedValue, expected);
    if (tone === "ok") {
      toast.success("Caixa fechado — bateu certinho", {
        description: `Contado ${formatBRL(countedValue)}, sem diferença.`,
      });
    } else if (tone === "sobra") {
      toast.warning("Caixa fechado com sobra", {
        description: `${formatBRL(Math.abs(difference))} a mais que o esperado. Vale conferir se alguma venda ficou sem registro.`,
      });
    } else {
      toast.error("Caixa fechado com falta", {
        description: `${formatBRL(Math.abs(difference))} a menos que o esperado. A diferença fica registrada no histórico.`,
      });
    }
    onDone();
  };

  if (step === "contagem") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Fechar o caixa — conferência às cegas</DialogTitle>
          <DialogDescription>
            Conte o dinheiro em espécie que está na gaveta e informe o total. O
            valor esperado só aparece depois, para que a contagem seja honesta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={check} className="grid gap-4" noValidate>
          <Field
            label="Valor contado na gaveta"
            htmlFor="counted-amount"
            required
            error={error ?? undefined}
            hint="Some notas e moedas. Não conte cartão nem Pix — só espécie."
          >
            <Input
              id="counted-amount"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
              value={counted}
              aria-invalid={!!error}
              onChange={(event) => {
                setCounted(event.target.value);
                if (error) setError(null);
              }}
            />
          </Field>

          <p className="flex items-start gap-1.5 rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
            <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />O saldo
            esperado está oculto de propósito. Conferência cega é o que revela
            diferenças reais no caixa.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancelar
            </Button>
            <Button type="submit">Conferir valores</Button>
          </DialogFooter>
        </form>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Conferência do caixa</DialogTitle>
        <DialogDescription>
          Compare os valores antes de confirmar. A diferença fica registrada no
          histórico do caixa.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <ComparisonRow label="Esperado no sistema" value={expected} />
        <ComparisonRow label="Contado na gaveta" value={countedValue} />
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg border p-3",
            tone === "ok"
              ? "border-success/40 bg-success/10"
              : tone === "sobra"
                ? "border-warning/50 bg-warning/10"
                : "border-critical/40 bg-critical/10"
          )}
        >
          <div>
            <p className="text-sm font-semibold">{DIFFERENCE_LABELS[tone]}</p>
            <p className="text-xs text-muted-foreground">
              {tone === "ok"
                ? "O dinheiro da gaveta bate com o previsto."
                : tone === "sobra"
                  ? "Há mais dinheiro do que o previsto — pode ser venda não registrada ou troco a menos."
                  : "Falta dinheiro na gaveta — confira sangrias sem registro e trocos dados a mais."}
            </p>
          </div>
          <p
            className={cn(
              "shrink-0 text-lg font-semibold tabular-nums",
              tone === "ok"
                ? "text-success-text"
                : tone === "sobra"
                  ? "text-[#8a6100] dark:text-warning"
                  : "text-critical"
            )}
          >
            {difference > 0 ? "+" : ""}
            {formatBRL(difference)}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep("contagem")}>
          Voltar e recontar
        </Button>
        <Button onClick={confirm}>
          <LockKeyhole /> Confirmar fechamento
        </Button>
      </DialogFooter>
    </>
  );
}

function ComparisonRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{formatBRL(value)}</span>
    </div>
  );
}
