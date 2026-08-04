"use client";

import { cn } from "@/lib/utils";

/**
 * Bloco visual da peça.
 *
 * O catálogo ainda não tem fotos reais: no lugar da imagem entra um gradiente
 * derivado da cor da variação, o que mantém a vitrine elegante e faz cada peça
 * ficar visualmente distinta. Quando as fotos existirem, só este componente muda.
 */

interface ColorTone {
  /** Tom principal, usado também na bolinha de cor. */
  base: string;
  /** Tom claro do gradiente. */
  tint: string;
}

function tone(base: string, tint: string): ColorTone {
  return { base, tint };
}

const COLOR_TONES: Record<string, ColorTone> = {
  preto: tone("#2b2a2e", "#565460"),
  branco: tone("#f4f2ee", "#ffffff"),
  "off white": tone("#ece4d6", "#f9f4ea"),
  bege: tone("#ddc9ae", "#f0e3d1"),
  caramelo: tone("#a9702f", "#d9a065"),
  terracota: tone("#ad5b3a", "#d68f6d"),
  vermelho: tone("#b0212b", "#d95a52"),
  vinho: tone("#6b1f34", "#a03c58"),
  "rosa seco": tone("#cf9aa0", "#eec7c8"),
  "verde militar": tone("#576247", "#8b9670"),
  "verde menta": tone("#8ec9b2", "#c8ead9"),
  "azul marinho": tone("#233450", "#3d5074"),
  "azul claro": tone("#9dc0e0", "#cfe3f5"),
  "jeans claro": tone("#93aecb", "#c4d7ea"),
  "jeans medio": tone("#5a7ca1", "#8aa9c6"),
  "jeans escuro": tone("#31435c", "#546b8b"),
  cinza: tone("#95948f", "#c4c3bf"),
  dourado: tone("#bd9a2c", "#e6cd77"),
  prata: tone("#adb1b6", "#dcdfe3"),
  listrado: tone("#d8d5cf", "#f2f0ec"),
};

/** Remove acentos e caixa para casar "Verde Militar" com a chave do mapa. */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Hash estável: cores novas ganham um tom próprio sem quebrar a hidratação. */
function hashHue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }
  return hash;
}

export function resolveTone(color?: string): ColorTone {
  if (!color) return tone("#c9bfb6", "#e9e2da");
  const key = normalize(color);
  const known = COLOR_TONES[key];
  if (known) return known;
  const hue = hashHue(key);
  return tone(`hsl(${hue} 28% 58%)`, `hsl(${hue} 34% 78%)`);
}

/** Fundo do bloco: listrado ganha tratamento próprio, o resto é gradiente. */
export function toneBackground(color?: string): string {
  const { base, tint } = resolveTone(color);
  if (color && normalize(color) === "listrado") {
    return `repeating-linear-gradient(135deg, ${tint} 0 14px, ${base} 14px 24px)`;
  }
  return `linear-gradient(150deg, ${tint} 0%, ${base} 100%)`;
}

/** Bolinha de cor usada nos cards e nos seletores. */
export function ColorSwatch({
  color,
  className,
  selected = false,
}: {
  color: string;
  className?: string;
  selected?: boolean;
}) {
  const { base, tint } = resolveTone(color);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-4 shrink-0 rounded-full border border-black/15 shadow-xs dark:border-white/20",
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-card",
        className
      )}
      style={{ background: `linear-gradient(140deg, ${tint}, ${base})` }}
    />
  );
}

/**
 * Bloco que substitui a foto do produto.
 * É decorativo: o nome também aparece como texto no card, então fica oculto
 * para leitores de tela.
 */
export function ProductMedia({
  name,
  color,
  className,
  compact = false,
}: {
  name: string;
  color?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative isolate overflow-hidden rounded-lg",
        !className && "aspect-[3/4] w-full",
        className
      )}
      style={{ background: toneBackground(color) }}
    >
      <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_8%,rgba(255,255,255,0.42),transparent_62%)]" />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.18)_100%)]" />
      {compact ? null : (
        <span className="absolute inset-x-2 bottom-2">
          <span className="line-clamp-2 rounded-md bg-white/88 px-2 py-1 text-[11px] font-medium leading-snug text-[#1b1613] shadow-xs">
            {name}
          </span>
        </span>
      )}
    </div>
  );
}
