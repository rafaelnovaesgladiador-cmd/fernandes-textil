const TIMEZONE = "America/Sao_Paulo";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});


const number = new Intl.NumberFormat("pt-BR");

const dateShort = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateDayMonth = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
});

const dateLong = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatBRL(value: number): string {
  return brl.format(value);
}

/** "R$ 4,5 mil" — implementação própria para render idêntico em qualquer ambiente. */
export function formatBRLCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000) {
    const mil = Math.round((abs / 1000) * 10) / 10;
    return `${sign}R$ ${String(mil).replace(".", ",")} mil`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}

export function formatNumber(value: number): string {
  return number.format(value);
}

export function formatDate(date: Date | string): string {
  return dateShort.format(typeof date === "string" ? new Date(date) : date);
}

export function formatDayMonth(date: Date | string): string {
  return dateDayMonth.format(typeof date === "string" ? new Date(date) : date);
}

export function formatDateLong(date: Date | string): string {
  return dateLong.format(typeof date === "string" ? new Date(date) : date);
}

export function formatDateTime(date: Date | string): string {
  return dateTime.format(typeof date === "string" ? new Date(date) : date);
}

/** Ex.: +12,5% | -8,3% */
export function formatDeltaPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
