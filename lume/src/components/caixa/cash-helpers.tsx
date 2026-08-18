"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  DoorOpen,
  LockKeyhole,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CASH_MOVEMENT_LABELS, type CashMovementType, type CashSession } from "@/lib/types";

/** Apoio comum às telas de caixa: contas do fechamento e rótulos. */

/** Aceita "1.234,56", "1234,56" e "1234.56". */
export function parseAmount(value: string): number {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function isValidAmount(value: string, { allowZero = false } = {}): boolean {
  const parsed = parseAmount(value);
  if (!Number.isFinite(parsed)) return false;
  return allowZero ? parsed >= 0 : parsed > 0;
}

export interface SessionTotals {
  /** Fundo de troco da abertura. */
  opening: number;
  /** Vendas do dia recebidas em dinheiro. */
  cashSales: number;
  /** Retiradas (valor absoluto). */
  withdrawals: number;
  /** Aportes de troco. */
  reinforcements: number;
  /** Fundo + dinheiro recebido + reforços − sangrias. */
  expected: number;
}

export function sessionTotals(
  session: CashSession,
  cashSales: number
): SessionTotals {
  let withdrawals = 0;
  let reinforcements = 0;
  for (const movement of session.movements) {
    if (movement.type === "sangria") withdrawals += Math.abs(movement.amount);
    if (movement.type === "reforco") reinforcements += Math.abs(movement.amount);
  }
  return {
    opening: session.openingAmount,
    cashSales,
    withdrawals,
    reinforcements,
    expected:
      session.openingAmount + cashSales + reinforcements - withdrawals,
  };
}

/** "4h 20min" — tempo com o caixa aberto. */
export function formatDuration(fromIso: string, toDate: Date): string {
  const ms = Math.max(0, toDate.getTime() - new Date(fromIso).getTime());
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

const MOVEMENT_ICONS: Record<CashMovementType, typeof DoorOpen> = {
  abertura: DoorOpen,
  sangria: ArrowUpFromLine,
  reforco: ArrowDownToLine,
  fechamento: LockKeyhole,
};

const MOVEMENT_VARIANTS: Record<
  CashMovementType,
  "secondary" | "critical" | "success" | "accent"
> = {
  abertura: "secondary",
  sangria: "critical",
  reforco: "success",
  fechamento: "accent",
};

export function MovementBadge({ type }: { type: CashMovementType }) {
  const Icon = MOVEMENT_ICONS[type];
  return (
    <Badge variant={MOVEMENT_VARIANTS[type]}>
      <Icon /> {CASH_MOVEMENT_LABELS[type]}
    </Badge>
  );
}

/** Cor da diferença de fechamento: sobra, falta ou caixa certinho. */
export function differenceTone(difference: number): "ok" | "sobra" | "falta" {
  if (Math.abs(difference) < 0.01) return "ok";
  return difference > 0 ? "sobra" : "falta";
}

export const DIFFERENCE_LABELS: Record<"ok" | "sobra" | "falta", string> = {
  ok: "Caixa certinho",
  sobra: "Sobra no caixa",
  falta: "Falta no caixa",
};
