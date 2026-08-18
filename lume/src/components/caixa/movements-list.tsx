"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL, formatDateTime } from "@/lib/format";
import type { CashMovement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MovementBadge } from "./cash-helpers";

/** Linha do tempo do caixa aberto: abertura, sangrias e reforços. */
export function MovementsList({ movements }: { movements: CashMovement[] }) {
  const ordered = [...movements].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimentações da sessão</CardTitle>
        <CardDescription>
          Tudo que entrou e saiu da gaveta fora das vendas, com responsável e
          horário.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {ordered.map((movement) => (
            <li
              key={movement.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <MovementBadge type={movement.type} />
                  <span className="text-sm font-medium">{movement.reason}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTime(movement.date)} · {movement.userName}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-medium tabular-nums",
                  movement.type === "sangria"
                    ? "text-critical"
                    : movement.type === "reforco"
                      ? "text-success-text"
                      : "text-foreground"
                )}
              >
                {movement.type === "sangria"
                  ? "−"
                  : movement.type === "reforco"
                    ? "+"
                    : ""}
                {formatBRL(Math.abs(movement.amount))}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
