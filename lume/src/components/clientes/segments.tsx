"use client";

import { DEMO_TODAY, diffDays, monthKey } from "@/lib/dates";
import type { CustomerStats } from "@/lib/metrics";
import { formatBRL } from "@/lib/format";
import type { Customer } from "@/lib/types";

/**
 * Segmentação de clientes usada na lista, nas campanhas e nas sugestões de
 * mensagem. A régua fica em um só lugar para que a contagem do chip, o
 * público da campanha e o texto sugerido nunca divirjam entre si.
 */

export type SegmentKey =
  | "todos"
  | "vip"
  | "novo"
  | "recorrente"
  | "inativo"
  | "aniversariante"
  | "pendente";

export interface SegmentDefinition {
  key: SegmentKey;
  label: string;
  /** O que define o segmento — aparece como dica e no diálogo de campanha. */
  description: string;
}

export const SEGMENTS: SegmentDefinition[] = [
  {
    key: "todos",
    label: "Todos",
    description: "Toda a base cadastrada na loja.",
  },
  {
    key: "vip",
    label: "VIP",
    description:
      "Os 15% que mais gastaram na loja. Sustentam boa parte do faturamento — merecem atenção antes de qualquer promoção geral.",
  },
  {
    key: "novo",
    label: "Novos",
    description:
      "Cadastradas nos últimos 60 dias. A segunda compra é o que transforma uma cliente nova em cliente de casa.",
  },
  {
    key: "recorrente",
    label: "Recorrentes",
    description:
      "Já compraram três vezes ou mais e continuam ativas. É a base mais previsível da loja.",
  },
  {
    key: "inativo",
    label: "Inativos",
    description:
      "Sem comprar há mais de 120 dias. Reativar quem já conhece a marca custa bem menos do que conquistar cliente nova.",
  },
  {
    key: "aniversariante",
    label: "Aniversariantes do mês",
    description:
      "Fazem aniversário neste mês. Uma lembrança simples costuma render visita à loja.",
  },
  {
    key: "pendente",
    label: "Com saldo pendente",
    description:
      "Têm parcelas de crediário em aberto ou vencidas. Cobrança gentil, antes que o valor envelheça.",
  },
];

export const SEGMENT_BY_KEY: Record<SegmentKey, SegmentDefinition> =
  SEGMENTS.reduce(
    (acc, segment) => {
      acc[segment.key] = segment;
      return acc;
    },
    {} as Record<SegmentKey, SegmentDefinition>
  );

/** Mês corrente da demonstração ("08"). */
export const CURRENT_MONTH = monthKey(DEMO_TODAY).slice(5, 7);

/** "12/03" → "03". */
export function birthdayMonth(birthday?: string): string | null {
  if (!birthday) return null;
  const parts = birthday.split("/");
  return parts.length === 2 ? parts[1] : null;
}

export function daysSinceSignup(customer: Customer): number {
  return diffDays(DEMO_TODAY, customer.createdAt);
}

/** Mesma régua de `inactiveCustomers` (+120 dias sem comprar). */
export function isInactive(stat: CustomerStats): boolean {
  return (
    (stat.daysSinceLastPurchase !== null && stat.daysSinceLastPurchase > 120) ||
    (stat.purchases === 0 && daysSinceSignup(stat.customer) > 120)
  );
}

export function matchesSegment(stat: CustomerStats, key: SegmentKey): boolean {
  switch (key) {
    case "todos":
      return true;
    case "vip":
      return stat.segment === "vip";
    case "novo":
      return daysSinceSignup(stat.customer) <= 60;
    case "recorrente":
      return stat.purchases >= 3 && !isInactive(stat);
    case "inativo":
      return isInactive(stat);
    case "aniversariante":
      return birthdayMonth(stat.customer.birthday) === CURRENT_MONTH;
    case "pendente":
      return stat.openBalance > 0;
  }
}

export function countBySegment(
  stats: CustomerStats[]
): Record<SegmentKey, number> {
  const counts = {} as Record<SegmentKey, number>;
  for (const segment of SEGMENTS) {
    counts[segment.key] = stats.filter((stat) =>
      matchesSegment(stat, segment.key)
    ).length;
  }
  return counts;
}

/** Lê o `?segmento=` da URL (links vindos dos alertas). */
export function parseSegment(value: string | null): SegmentKey {
  const found = SEGMENTS.find((segment) => segment.key === value);
  return found ? found.key : "todos";
}

// ---------------------------------------------------------------------------
// Rótulos do segmento calculado por cliente
// ---------------------------------------------------------------------------

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerStats["segment"], string> = {
  vip: "VIP",
  novo: "Nova",
  recorrente: "Recorrente",
  inativo: "Inativa",
  sem_compra: "Sem compra",
};

export const CUSTOMER_SEGMENT_VARIANT = {
  vip: "accent",
  novo: "success",
  recorrente: "secondary",
  inativo: "warning",
  sem_compra: "outline",
} as const;

// ---------------------------------------------------------------------------
// Mensagens sugeridas
// ---------------------------------------------------------------------------

const firstName = (name: string) => name.split(" ")[0];

/** Texto pronto para WhatsApp, já personalizado com o histórico da cliente. */
export function personalMessage(stat: CustomerStats, storeName: string): string {
  const nome = firstName(stat.customer.name);
  const tamanho = stat.customer.preferredSize;
  const categoria = stat.favoriteCategory?.toLowerCase();

  if (stat.openBalance > 0) {
    return `Oi, ${nome}! Aqui é da ${storeName} 💛 Passando para lembrar do seu crediário: ainda constam ${formatBRL(
      stat.openBalance
    )} em aberto. Se ficar melhor, a gente reparcela — é só me falar o que cabe no seu mês.`;
  }

  if (isInactive(stat)) {
    return `Oi, ${nome}! Sentimos sua falta na ${storeName} 💛 Chegaram peças novas${
      categoria ? ` de ${categoria}` : ""
    } e separei algumas no tamanho ${tamanho} pensando em você. Quer que eu mande as fotos?`;
  }

  if (stat.purchases === 0) {
    return `Oi, ${nome}! Aqui é da ${storeName} 💛 Vi que você ainda não conhece a coleção nova. Posso te mandar as peças no tamanho ${tamanho} que estão saindo mais?`;
  }

  if (birthdayMonth(stat.customer.birthday) === CURRENT_MONTH) {
    return `Oi, ${nome}! Mês de aniversário pede presente 🎁 A ${storeName} preparou uma condição especial para você. Passa aqui para provar as novidades no tamanho ${tamanho}?`;
  }

  if (stat.segment === "vip") {
    return `Oi, ${nome}! Aqui é da ${storeName} 💛 Chegou a coleção nova e, como você é cliente de casa, quis te avisar antes: separei peças${
      categoria ? ` de ${categoria}` : ""
    } no tamanho ${tamanho}. Quer que eu guarde?`;
  }

  return `Oi, ${nome}! Aqui é da ${storeName} 💛 Chegaram novidades${
    categoria ? ` de ${categoria}` : ""
  } no tamanho ${tamanho}. Posso te mandar as fotos?`;
}

/** Sugestão de texto para uma campanha inteira (sem nome da cliente). */
export function suggestedCampaignMessage(
  key: SegmentKey,
  storeName: string
): string {
  switch (key) {
    case "vip":
      return `Oi! Aqui é da ${storeName} 💛 Você é uma das nossas clientes de casa, então está recebendo a coleção nova em primeira mão. Quer que eu separe peças no seu tamanho antes de abrir para todo mundo?`;
    case "novo":
      return `Oi! Que bom ter você com a gente na ${storeName} 💛 Na sua próxima visita, a segunda peça sai com condição especial. Vem conhecer as novidades?`;
    case "recorrente":
      return `Oi! Aqui é da ${storeName} 💛 Chegaram peças novas que combinam com o que você já levou. Posso mandar as fotos?`;
    case "inativo":
      return `Oi! Faz tempo que a gente não se vê 💛 A ${storeName} está com coleção nova e uma condição especial de volta para você. Quer dar uma olhada?`;
    case "aniversariante":
      return `Oi! Mês de aniversário merece presente 🎁 A ${storeName} preparou uma condição especial para você usar até o fim do mês. Vem escolher!`;
    case "pendente":
      return `Oi! Aqui é da ${storeName} 💛 Passando para combinar as parcelas do seu crediário que estão em aberto. Se preferir, a gente reparcela — é só responder aqui.`;
    case "todos":
      return `Oi! Aqui é da ${storeName} 💛 Chegou coleção nova na loja. Quer que eu mande as fotos das peças no seu tamanho?`;
  }
}
