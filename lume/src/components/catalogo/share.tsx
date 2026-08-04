"use client";

import { formatBRL } from "@/lib/format";
import type { WishlistItem } from "./wishlist";

/**
 * Ponte entre a vitrine e o WhatsApp.
 *
 * O pedido não vira venda automaticamente: a cliente manda a lista pronta e a
 * loja fecha a conversa no atendimento — que é como a venda por WhatsApp
 * realmente acontece.
 */

/** Somente dígitos, com DDI 55 quando o lojista informou apenas DDD + número. */
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}

/** "+55 (19) 98765-4321" para leitura humana. */
export function formatPhone(phone: string): string {
  const digits = sanitizePhone(phone);
  if (digits.length < 12) return phone;
  const country = digits.slice(0, 2);
  const area = digits.slice(2, 4);
  const rest = digits.slice(4);
  const middle = rest.length > 8 ? rest.slice(0, 5) : rest.slice(0, 4);
  const end = rest.length > 8 ? rest.slice(5) : rest.slice(4);
  return `+${country} (${area}) ${middle}-${end}`;
}

export function whatsappLink(phone: string, message: string): string {
  const digits = sanitizePhone(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export interface OrderMessageInput {
  storeName: string;
  items: WishlistItem[];
  showPrices: boolean;
  /** Endereço da vitrine, quando disponível. */
  catalogUrl?: string;
}

/** Mensagem de texto puro — o WhatsApp usa *asterisco* para negrito. */
export function buildOrderMessage(input: OrderMessageInput): string {
  const lines: string[] = [
    `*${input.storeName}*`,
    "Olá! Vim pelo catálogo e separei estas peças:",
    "",
  ];

  input.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    const details = [`Cor: ${item.color}`, `Tam: ${item.size}`];
    if (item.quantity > 1) details.push(`Qtd: ${item.quantity}`);
    lines.push(`   ${details.join(" | ")}`);
    if (input.showPrices) {
      lines.push(`   ${formatBRL(item.price * item.quantity)}`);
    }
  });

  if (input.showPrices) {
    const total = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    lines.push("", `*Total: ${formatBRL(total)}*`);
  }

  lines.push("", "Consegue confirmar a disponibilidade?");
  if (input.catalogUrl) lines.push("", input.catalogUrl);

  return lines.join("\n");
}

/** Mensagem de uma peça só, disparada direto da tela do produto. */
export function buildSingleItemMessage(input: {
  storeName: string;
  item: WishlistItem;
  showPrices: boolean;
}): string {
  return buildOrderMessage({
    storeName: input.storeName,
    items: [input.item],
    showPrices: input.showPrices,
  });
}

/** Copia para a área de transferência; devolve false se o navegador bloquear. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Contexto inseguro ou permissão negada: cai no plano B abaixo.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Abre o WhatsApp em nova aba, sem dar acesso à janela de origem. */
export function openWhatsapp(phone: string, message: string): void {
  window.open(whatsappLink(phone, message), "_blank", "noopener,noreferrer");
}
