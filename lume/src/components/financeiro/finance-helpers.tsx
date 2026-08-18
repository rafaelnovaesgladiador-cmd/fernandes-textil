"use client";

import { AlertTriangle, Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DAY_MS, DEMO_TODAY_START, addDays, dayKey } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { Payable, Receivable } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Apoio comum às abas do financeiro.
 *
 * A regra central: quem manda na situação de uma conta é o vencimento, não
 * apenas o status gravado — uma conta "aberta" com data no passado é uma conta
 * vencida, e a tela precisa dizer isso na cara do lojista.
 */

export type SettleStatus = "aberto" | "vencido" | "liquidado";

function dayStartMs(date: string | Date): number {
  return new Date(`${dayKey(date)}T00:00:00-03:00`).getTime();
}

/** Dias até o vencimento: negativo = atrasada, 0 = vence hoje. */
export function daysUntilDue(dueDate: string): number {
  return Math.round((dayStartMs(dueDate) - DEMO_TODAY_START.getTime()) / DAY_MS);
}

export function payableStatus(payable: Payable): SettleStatus {
  if (payable.status === "pago") return "liquidado";
  return daysUntilDue(payable.dueDate) < 0 ? "vencido" : "aberto";
}

export function receivableStatus(receivable: Receivable): SettleStatus {
  if (receivable.status === "recebido") return "liquidado";
  return daysUntilDue(receivable.dueDate) < 0 ? "vencido" : "aberto";
}

export function plural(value: number, one: string, many: string): string {
  return Math.abs(value) === 1 ? one : many;
}

const SETTLE_LABELS: Record<"pagar" | "receber", Record<SettleStatus, string>> = {
  pagar: { aberto: "Em aberto", vencido: "Vencida", liquidado: "Paga" },
  receber: { aberto: "A receber", vencido: "Vencida", liquidado: "Recebida" },
};

export function SettleBadge({
  status,
  kind,
}: {
  status: SettleStatus;
  kind: "pagar" | "receber";
}) {
  const label = SETTLE_LABELS[kind][status];
  if (status === "liquidado")
    return (
      <Badge variant="success">
        <Check /> {label}
      </Badge>
    );
  if (status === "vencido")
    return (
      <Badge variant="critical">
        <AlertTriangle /> {label}
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <Clock /> {label}
    </Badge>
  );
}

/** Data de vencimento com a leitura em dias ("vence em 3 dias"). */
export function DueDateCell({
  dueDate,
  status,
}: {
  dueDate: string;
  status: SettleStatus;
}) {
  const days = daysUntilDue(dueDate);
  const relative =
    status === "liquidado"
      ? null
      : days < 0
        ? `vencida há ${Math.abs(days)} ${plural(days, "dia", "dias")}`
        : days === 0
          ? "vence hoje"
          : `vence em ${days} ${plural(days, "dia", "dias")}`;

  return (
    <div className="leading-tight">
      <span className="tabular-nums">{formatDate(dueDate)}</span>
      {relative ? (
        <span
          className={cn(
            "block text-xs",
            days < 0
              ? "font-medium text-critical"
              : days <= 3
                ? "font-medium text-[#8a6100] dark:text-warning"
                : "text-muted-foreground"
          )}
        >
          {relative}
        </span>
      ) : null}
    </div>
  );
}

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

export function isValidAmount(value: string): boolean {
  const parsed = parseAmount(value);
  return Number.isFinite(parsed) && parsed > 0;
}

/** "2026-08-08" para usar em <input type="date">. */
export function dateInputValue(offsetDays = 0): string {
  return dayKey(addDays(DEMO_TODAY_START, offsetDays));
}

/** Converte o valor do <input type="date"> para ISO no fuso da loja. */
export function isoFromDateInput(value: string): string {
  return new Date(`${value}T12:00:00-03:00`).toISOString();
}

const MONTH_ABBR = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2026-08" → "ago/26" */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_ABBR[Number(month) - 1] ?? month}/${year.slice(2)}`;
}
