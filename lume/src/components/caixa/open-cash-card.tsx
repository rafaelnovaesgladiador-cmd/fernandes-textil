"use client";

import { useState } from "react";
import { DoorOpen, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-field";
import { formatBRL } from "@/lib/format";
import { openCashSession } from "@/lib/store";
import { isValidAmount, parseAmount } from "./cash-helpers";

const SUGGESTIONS = [100, 200, 300, 500];

/** Abertura do caixa: o fundo de troco é o ponto de partida da conferência. */
export function OpenCashCard() {
  const [amount, setAmount] = useState("300");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidAmount(amount, { allowZero: true })) {
      setError("Informe o valor do fundo de troco (pode ser 0).");
      return;
    }
    const value = parseAmount(amount);
    openCashSession(value);
    setError(null);
    toast.success("Caixa aberto", {
      description: `Fundo de troco de ${formatBRL(value)} registrado. Bom dia de vendas!`,
    });
  };

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <div className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <DoorOpen className="size-5" />
        </div>
        <CardTitle className="mt-2 text-base">Abrir o caixa do dia</CardTitle>
        <CardDescription>
          Conte o dinheiro que ficou na gaveta para dar troco e informe o valor. É
          por ele que a conferência do fechamento vai começar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field
            label="Fundo de troco"
            htmlFor="opening-amount"
            required
            error={error ?? undefined}
            hint="Dinheiro em espécie que está na gaveta agora."
          >
            <Input
              id="opening-amount"
              inputMode="decimal"
              value={amount}
              autoFocus
              aria-invalid={!!error}
              onChange={(event) => {
                setAmount(event.target.value);
                if (error) setError(null);
              }}
              placeholder="0,00"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((value) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAmount(String(value));
                  setError(null);
                }}
              >
                {formatBRL(value)}
              </Button>
            ))}
          </div>

          <Button type="submit" className="w-full">
            <DoorOpen /> Abrir caixa
          </Button>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Enquanto o caixa está fechado, as vendas continuam sendo registradas —
            mas você não consegue conferir o dinheiro da gaveta.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
