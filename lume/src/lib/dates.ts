/**
 * Utilitários de data ancorados em America/Sao_Paulo.
 *
 * O "hoje" da demonstração é um instante fixo — assim, servidor e cliente
 * geram exatamente a mesma massa de dados (sem divergência de hidratação)
 * e os números batem entre Dashboard, vendas e financeiro.
 */

export const DEMO_TODAY = new Date("2026-08-01T15:30:00-03:00");

export const DAY_MS = 86_400_000;

/** Início do dia da demo no fuso de São Paulo. */
export const DEMO_TODAY_START = new Date("2026-08-01T00:00:00-03:00");

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const monthKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
});

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
});

/** "2026-08-01" no fuso de São Paulo. */
export function dayKey(date: Date | string): string {
  return dayKeyFormat.format(typeof date === "string" ? new Date(date) : date);
}

/** "2026-08" no fuso de São Paulo. */
export function monthKey(date: Date | string): string {
  return monthKeyFormat.format(typeof date === "string" ? new Date(date) : date);
}

/** 0 = domingo … 6 = sábado, no fuso de São Paulo. */
export function weekdayIndex(date: Date): number {
  const name = weekdayFormat.format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Data deslocada em dias a partir do início do dia da demo. */
export function demoDay(offsetDays: number, hour = 12, minute = 0): Date {
  return new Date(
    DEMO_TODAY_START.getTime() +
      offsetDays * DAY_MS +
      hour * 3_600_000 +
      minute * 60_000
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function diffDays(later: Date | string, earlier: Date | string): number {
  const a = typeof later === "string" ? new Date(later) : later;
  const b = typeof earlier === "string" ? new Date(earlier) : earlier;
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}
