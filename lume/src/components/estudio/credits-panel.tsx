"use client";

import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/format";
import { grantCredits } from "@/lib/store";
import type { AiCreditBalance } from "@/lib/types";
import { AiDisclaimer, CreditsBlocked } from "./studio-common";

/** Quantidade adicionada a cada recarga na demonstração. */
const RECHARGE = 20;

/**
 * Painel de créditos.
 *
 * Fica no topo do estúdio porque é a informação que decide se a lojista pode
 * ou não gerar: o saldo aparece antes de qualquer botão que o consuma.
 */
export function CreditsPanel({
  credits,
  remaining,
}: {
  credits: AiCreditBalance;
  remaining: number;
}) {
  const percent =
    credits.granted > 0
      ? Math.min(100, (credits.used / credits.granted) * 100)
      : 100;
  const blocked = remaining <= 0;

  const addCredits = () => {
    grantCredits(RECHARGE);
    toast.success("Créditos adicionados", {
      description: `${formatNumber(RECHARGE)} créditos entraram no saldo da loja.`,
    });
  };

  const addButton = (
    <Button className="h-11 w-full sm:w-auto" onClick={addCredits}>
      <Plus /> Adicionar créditos
    </Button>
  );

  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Créditos de geração
          </CardTitle>
          <CardDescription>
            Cada imagem gerada consome 1 crédito. Gerações que falham não são
            cobradas — o crédito volta na hora para o saldo.
          </CardDescription>
        </div>
        {blocked ? null : <div className="shrink-0">{addButton}</div>}
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-secondary/40 p-3">
            <dt className="text-xs text-muted-foreground">Disponíveis</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl">
              {formatNumber(remaining)}
            </dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Concedidos</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl">
              {formatNumber(credits.granted)}
            </dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Usados</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl">
              {formatNumber(credits.used)}
            </dd>
          </div>
        </dl>

        <div className="space-y-1.5">
          <Progress
            value={percent}
            aria-label="Consumo de créditos"
            indicatorClassName={blocked ? "bg-critical" : undefined}
          />
          <p className="text-xs text-muted-foreground">
            {formatNumber(credits.used)} de {formatNumber(credits.granted)}{" "}
            créditos consumidos.
          </p>
        </div>

        {blocked ? <CreditsBlocked action={addButton} /> : null}

        <AiDisclaimer />
      </CardContent>
    </Card>
  );
}
