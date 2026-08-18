"use client";

import { Coins, Heart, PiggyBank, TicketPercent } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatBRL, formatPercent, initials } from "@/lib/format";
import type { SellerPerformance } from "@/lib/metrics";

export function returnRate(entry: SellerPerformance): number {
  const total = entry.salesCount + entry.returns;
  return total > 0 ? (entry.returns / total) * 100 : 0;
}

interface Highlight {
  key: string;
  icon: LucideIcon;
  title: string;
  entry: SellerPerformance;
  value: string;
  explanation: string;
}

function best(
  data: SellerPerformance[],
  score: (entry: SellerPerformance) => number
): SellerPerformance | null {
  const eligible = data.filter((entry) => entry.salesCount > 0);
  if (eligible.length === 0) return null;
  return eligible.reduce((top, entry) => (score(entry) > score(top) ? entry : top));
}

export function buildHighlights(data: SellerPerformance[]): Highlight[] {
  const highlights: Highlight[] = [];

  const revenue = best(data, (entry) => entry.revenue);
  if (revenue) {
    highlights.push({
      key: "faturamento",
      icon: Coins,
      title: "Maior faturamento",
      entry: revenue,
      value: formatBRL(revenue.revenue),
      explanation: "Vendeu o maior volume no período.",
    });
  }

  const margin = best(data, (entry) => entry.margin);
  if (margin) {
    highlights.push({
      key: "margem",
      icon: PiggyBank,
      title: "Maior margem",
      entry: margin,
      value: formatPercent(margin.margin, 1),
      explanation: "Segurou o desconto: cada real vendido virou mais lucro.",
    });
  }

  const ticket = best(data, (entry) => entry.ticket);
  if (ticket) {
    highlights.push({
      key: "ticket",
      icon: TicketPercent,
      title: "Maior ticket médio",
      entry: ticket,
      value: formatBRL(ticket.ticket),
      explanation: "Constrói look completo em vez de vender peça solta.",
    });
  }

  const lowestReturn = best(data, (entry) => -returnRate(entry));
  if (lowestReturn) {
    highlights.push({
      key: "devolucao",
      icon: Heart,
      title: "Menor índice de devolução",
      entry: lowestReturn,
      value:
        lowestReturn.returns === 0
          ? "Nenhuma devolução"
          : formatPercent(returnRate(lowestReturn), 1),
      explanation: "Vendeu a peça certa: cliente ficou satisfeita e não voltou para trocar.",
    });
  }

  return highlights;
}

/**
 * Reconhecimento por critério. A loja não avalia vendedora só por faturamento —
 * a frase abaixo dos cartões deixa isso explícito para a equipe.
 */
export function SellerHighlights({ data }: { data: SellerPerformance[] }) {
  const highlights = buildHighlights(data);
  if (highlights.length === 0) return null;

  return (
    <section aria-label="Destaques da equipe" className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {highlights.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <Card key={highlight.key} className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="size-4" /> {highlight.title}
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback
                    className="text-white"
                    style={{ backgroundColor: highlight.entry.seller.avatarColor }}
                  >
                    {initials(highlight.entry.seller.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {highlight.entry.seller.name}
                  </p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {highlight.value}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 text-xs text-muted-foreground">
                {highlight.explanation}
              </p>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Aqui ninguém é avaliada só por faturamento. Quem vende menos, mas desconta
        pouco, atende mais clientes e quase não tem devolução, muitas vezes deixa
        mais lucro na loja do que quem lidera o ranking de volume.
      </p>
    </section>
  );
}
