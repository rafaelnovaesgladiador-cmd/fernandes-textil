"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, TriangleAlert } from "lucide-react";
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
import { addCashMovement } from "@/lib/store";
import { isValidAmount, parseAmount } from "./cash-helpers";

type MovementType = "sangria" | "reforco";

const CONTENT: Record<
  MovementType,
  { title: string; description: string; action: string; reasons: string[] }
> = {
  sangria: {
    title: "Registrar sangria",
    description:
      "Sangria é dinheiro que sai da gaveta durante o dia — depósito no banco, pagamento em espécie ou retirada. Registrar mantém a conferência do fechamento correta.",
    action: "Registrar sangria",
    reasons: [
      "Depósito bancário",
      "Pagamento a fornecedor",
      "Retirada do proprietário",
      "Troco para outro caixa",
    ],
  },
  reforco: {
    title: "Registrar reforço",
    description:
      "Reforço é dinheiro que entra na gaveta fora das vendas — normalmente troco extra trazido para o caixa.",
    action: "Registrar reforço",
    reasons: ["Troco adicional", "Aporte do proprietário", "Transferência de caixa"],
  },
};

/** Sangria e reforço: toda entrada e saída de espécie fora das vendas. */
export function CashMovementDialog({
  type,
  open,
  onOpenChange,
  expected,
}: {
  type: MovementType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saldo esperado atual — usado para avisar sobre sangria maior que o caixa. */
  expected: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* O conteúdo desmonta ao fechar: cada abertura começa com o form limpo. */}
      <DialogContent>
        <MovementForm
          type={type}
          expected={expected}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MovementForm({
  type,
  expected,
  onDone,
}: {
  type: MovementType;
  expected: number;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const content = CONTENT[type];

  const parsed = parseAmount(amount);
  const exceedsCash =
    type === "sangria" && Number.isFinite(parsed) && parsed > expected;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { amount?: string; reason?: string } = {};
    if (!isValidAmount(amount)) nextErrors.amount = "Informe um valor maior que zero";
    if (reason.trim().length < 3) nextErrors.reason = "Descreva o motivo";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const value = parseAmount(amount);
    addCashMovement({ type, amount: value, reason: reason.trim() });
    toast.success(type === "sangria" ? "Sangria registrada" : "Reforço registrado", {
      description: `${formatBRL(value)} — ${reason.trim()}. O saldo esperado do caixa já foi atualizado.`,
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{content.title}</DialogTitle>
        <DialogDescription>{content.description}</DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field
          label="Valor"
          htmlFor="movement-amount"
          required
          error={errors.amount}
          hint="Use vírgula para os centavos."
        >
          <Input
            id="movement-amount"
            inputMode="decimal"
            placeholder="0,00"
            autoFocus
            value={amount}
            aria-invalid={!!errors.amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        {exceedsCash ? (
          <p className="flex items-start gap-1.5 rounded-md border border-critical/40 bg-critical/8 p-2.5 text-xs text-critical">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Você está retirando mais do que o caixa tem hoje ({formatBRL(expected)}).
            Confira o valor antes de confirmar.
          </p>
        ) : null}

        <Field
          label="Motivo"
          htmlFor="movement-reason"
          required
          error={errors.reason}
        >
          <Input
            id="movement-reason"
            placeholder="Ex.: Depósito no banco"
            value={reason}
            aria-invalid={!!errors.reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {content.reasons.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReason(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit">
            {type === "sangria" ? <ArrowUpFromLine /> : <ArrowDownToLine />}
            {content.action}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
