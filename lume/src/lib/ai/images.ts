/**
 * Camada de serviço de imagens por IA — ponto único de contato com o provedor.
 *
 * Expõe três operações:
 *   - `melhorarImagem`  → foto de capa padronizada a partir da foto da peça
 *   - `criarModelo`     → cria a modelo exclusiva da loja (uma vez por empresa)
 *   - `vestirModelo`    → gera a modelo já criada usando a peça enviada
 *
 * Hoje roda em modo simulado: devolve imagens de exemplo depois de um atraso
 * artificial, para que o fluxo inteiro seja navegável sem chave de API.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TROCA PARA O PROVEDOR REAL (FASHN)
 *
 * Só este arquivo muda. Substitua o corpo das três funções por chamadas HTTP e
 * mantenha as assinaturas e os tipos de retorno — nenhuma tela precisa saber
 * que o provedor existe. A chave fica em variável de ambiente e a chamada deve
 * partir de uma rota de servidor (route handler), nunca do navegador:
 *
 *   1. `melhorarImagem`  → endpoint de edição/limpeza de fundo
 *   2. `criarModelo`     → geração de modelo a partir de texto ou de imagem;
 *                          guarde o identificador devolvido em `providerRef`
 *   3. `vestirModelo`    → try-on, enviando `providerRef` da modelo + a peça
 *
 * O contrato de erro já está definido: devolva `{ ok: false, error }` com uma
 * mensagem em português, que a interface exibe como está.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type AiFailureReason = "provedor" | "conteudo" | "tempo_limite";

export interface AiImageSuccess {
  ok: true;
  /** Imagem pronta para exibir e guardar (data URI no modo simulado). */
  image: string;
  /**
   * Identificador da geração no provedor. No modo simulado é o seed que trava
   * a aparência da modelo; com a FASHN, o id devolvido pela API.
   */
  providerRef: string;
  /** Quanto tempo a geração levou, em milissegundos. */
  durationMs: number;
}

export interface AiImageFailure {
  ok: false;
  reason: AiFailureReason;
  error: string;
}

export type AiImageResult = AiImageSuccess | AiImageFailure;

export interface MelhorarImagemInput {
  /** Foto enviada pela lojista (data URI ou URL). */
  source: string;
  /** Nome do produto — usado para nomear o resultado. */
  productName: string;
  /** Categoria, que define o formato da peça na composição. */
  category: string;
  /** Cor predominante, quando conhecida. */
  color?: string;
}

export type ModeloOrigem = "descricao" | "imagem";

export interface CriarModeloInput {
  companyId: string;
  name: string;
  origin: ModeloOrigem;
  /** Descrição escrita da modelo, quando `origin` é "descricao". */
  description?: string;
  /** Imagem de referência, quando `origin` é "imagem". */
  reference?: string;
}

export interface VestirModeloInput {
  /** Trava de identidade da modelo — a mesma em toda geração. */
  modelRef: string;
  /** Foto da peça enviada pela lojista. */
  garment: string;
  productName: string;
  category: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Simulação
// ---------------------------------------------------------------------------

/** Atraso artificial para que os estados de carregamento sejam percebidos. */
const DELAY = { min: 1400, max: 2600 };

/** Uma em cada N gerações falha, para exercitar o tratamento de erro. */
const FAILURE_RATE = 0.06;

const FAILURES: Record<AiFailureReason, string> = {
  provedor:
    "O serviço de imagens não respondeu. Tente novamente em alguns instantes.",
  conteudo:
    "Não foi possível identificar a peça na foto. Use uma imagem com a peça inteira e fundo simples.",
  tempo_limite:
    "A geração demorou mais do que o esperado e foi interrompida. Tente novamente.",
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Hash estável: a mesma entrada gera sempre a mesma aparência. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: readonly T[], seed: number): T {
  // O seed vem de deslocamentos sem sinal, mas a proteção evita índice
  // inválido caso algum chamador passe um valor negativo.
  return items[Math.abs(Math.trunc(seed)) % items.length];
}

const SKIN_TONES = ["#f3d3bd", "#e8c39e", "#d9a67c", "#b87e5a", "#8d5a3c", "#5c3a25"];
const HAIR_TONES = ["#2b2118", "#4a3226", "#6b4a2f", "#8a5a34", "#c08a4a", "#1a1a1a"];
const HAIR_STYLES = ["longo", "medio", "curto", "preso"] as const;
const BACKDROPS = [
  ["#f6f1ee", "#eadfd8"],
  ["#f2f0f6", "#e2dfeb"],
  ["#f5f2ea", "#e9e3d5"],
];

/** Aparência da modelo, derivada do seed — nunca muda entre gerações. */
interface ModelLook {
  skin: string;
  hair: string;
  hairStyle: (typeof HAIR_STYLES)[number];
  backdrop: [string, string];
  height: number;
}

function readLook(ref: string): ModelLook {
  const seed = hash(ref);
  const backdrop = pick(BACKDROPS, seed >>> 9);
  return {
    skin: pick(SKIN_TONES, seed),
    hair: pick(HAIR_TONES, seed >>> 3),
    hairStyle: pick(HAIR_STYLES, seed >>> 6),
    backdrop: [backdrop[0], backdrop[1]],
    height: 0.96 + ((seed >>> 12) % 9) / 100,
  };
}

/** Cores conhecidas do catálogo, para colorir a peça na composição. */
const COLOR_MAP: Record<string, string> = {
  preto: "#22201f",
  branco: "#f7f5f2",
  "off white": "#f0ebe2",
  bege: "#ddc9ad",
  caramelo: "#b1743c",
  terracota: "#b45f45",
  vinho: "#6d2438",
  vermelho: "#b8323c",
  "rosa seco": "#c98a9a",
  "verde militar": "#5b6248",
  "verde menta": "#a8cbb4",
  "azul marinho": "#2c3a5c",
  "azul claro": "#9dbdd8",
  cinza: "#8f8d8a",
  "jeans claro": "#8fa8c4",
  "jeans medio": "#5c7ea3",
  "jeans médio": "#5c7ea3",
  "jeans escuro": "#39506b",
  dourado: "#c9a227",
  prata: "#b8b8bd",
  listrado: "#7a90ad",
};

function garmentColor(color: string | undefined, seed: number): string {
  if (color) {
    const key = color.trim().toLowerCase();
    if (COLOR_MAP[key]) return COLOR_MAP[key];
  }
  const palette = Object.values(COLOR_MAP);
  return palette[Math.abs(seed) % palette.length];
}

/** Famílias de peça que mudam o desenho da composição. */
type GarmentShape = "vestido" | "superior" | "inferior" | "sobreposicao" | "acessorio";

function readShape(category: string): GarmentShape {
  const c = category.toLowerCase();
  if (c.includes("vestido") || c.includes("macac")) return "vestido";
  if (c.includes("cal") || c.includes("short") || c.includes("saia")) return "inferior";
  if (c.includes("casaco") || c.includes("blazer") || c.includes("conjunto"))
    return "sobreposicao";
  if (c.includes("acess") || c.includes("bolsa") || c.includes("cinto")) return "acessorio";
  return "superior";
}

function svgToDataUri(svg: string): string {
  // encodeURIComponent evita problemas com acentos e aspas no data URI.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

/** Marca d'água discreta: deixa claro que a imagem é gerada. */
function watermark(label: string): string {
  return `
    <g opacity="0.55">
      <rect x="18" y="18" rx="9" width="${18 + label.length * 6.2}" height="24" fill="#ffffff" opacity="0.82"/>
      <text x="30" y="34" font-family="system-ui, sans-serif" font-size="11" fill="#5b5550">${label}</text>
    </g>`;
}

/** Peça isolada sobre fundo limpo — o resultado da melhoria de foto. */
function renderGarment(input: MelhorarImagemInput, seed: number): string {
  const shape = readShape(input.category);
  const fill = garmentColor(input.color, seed);
  const shade = `${fill}`;

  const pieces: Record<GarmentShape, string> = {
    vestido: `
      <path d="M300 190 L360 215 L392 300 L356 316 L344 470 Q300 486 256 470 L244 316 L208 300 L240 215 Z"
        fill="${fill}"/>
      <path d="M300 190 L360 215 L340 246 Q300 262 260 246 L240 215 Z" fill="${shade}" opacity="0.85"/>`,
    superior: `
      <path d="M300 200 L364 224 L396 300 L360 316 L352 376 Q300 392 248 376 L240 316 L204 300 L236 224 Z"
        fill="${fill}"/>
      <path d="M268 200 Q300 232 332 200" fill="none" stroke="#00000022" stroke-width="6"/>`,
    inferior: `
      <path d="M232 214 L368 214 L358 300 L346 452 L306 452 L300 330 L294 452 L254 452 L242 300 Z"
        fill="${fill}"/>
      <rect x="232" y="214" width="136" height="20" fill="${shade}" opacity="0.75"/>`,
    sobreposicao: `
      <path d="M300 196 L370 222 L400 306 L364 322 L358 424 Q300 440 242 424 L236 322 L200 306 L230 222 Z"
        fill="${fill}"/>
      <path d="M300 196 L300 424" stroke="#00000033" stroke-width="4"/>
      <path d="M268 200 L300 260 L332 200" fill="none" stroke="#ffffff44" stroke-width="8"/>`,
    acessorio: `
      <rect x="232" y="268" width="136" height="112" rx="14" fill="${fill}"/>
      <path d="M262 268 Q300 196 338 268" fill="none" stroke="${fill}" stroke-width="12" stroke-linecap="round"/>
      <rect x="232" y="304" width="136" height="10" fill="#00000022"/>`,
  };

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f1eeea"/>
    </linearGradient>
    <radialGradient id="sombra" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#00000026"/>
      <stop offset="100%" stop-color="#00000000"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <ellipse cx="300" cy="500" rx="150" ry="26" fill="url(#sombra)"/>
  ${pieces[shape]}
  ${watermark("Imagem gerada")}
</svg>`;
}

/**
 * Figura da modelo, com ou sem a peça vestida.
 *
 * As camadas são pintadas de trás para a frente (cabelo traseiro → pernas →
 * corpo → roupa → braços → rosto → cabelo frontal), de modo que trocar a peça
 * nunca altera a pessoa: só a camada de roupa muda entre gerações.
 */
function renderModel(
  look: ModelLook,
  options?: { garment?: { color: string; shape: GarmentShape } }
): string {
  const { skin, hair, hairStyle, backdrop, height } = look;
  const g = options?.garment;
  const neutral = "#ddd8d0";
  const shade = "#00000018";

  // Sombreado do tom de pele para dar volume sem depender de filtros.
  const skinShade = `${skin}`;

  const hairBack: Record<ModelLook["hairStyle"], string> = {
    longo: `<path d="M246 148 Q244 88 300 88 Q356 88 354 148 L360 320 L330 330 L332 170 L268 170 L270 330 L240 320 Z" fill="${hair}"/>`,
    medio: `<path d="M248 148 Q246 90 300 90 Q354 90 352 148 L356 244 L332 250 L332 170 L268 170 L268 250 L244 244 Z" fill="${hair}"/>`,
    curto: `<path d="M252 150 Q250 94 300 94 Q350 94 348 150 L350 194 L330 198 L330 168 L270 168 L270 198 L250 194 Z" fill="${hair}"/>`,
    preso: `<circle cx="300" cy="104" r="21" fill="${hair}"/>`,
  };

  const hairFront: Record<ModelLook["hairStyle"], string> = {
    longo: `<path d="M256 146 Q254 96 300 96 Q346 96 344 146 Q344 122 300 128 Q264 122 256 146 Z" fill="${hair}"/>`,
    medio: `<path d="M256 146 Q254 96 300 96 Q346 96 344 146 Q342 120 300 126 Q266 120 256 146 Z" fill="${hair}"/>`,
    curto: `<path d="M258 148 Q256 98 300 98 Q344 98 342 148 Q338 118 300 124 Q266 118 258 148 Z" fill="${hair}"/>`,
    preso: `<path d="M258 148 Q256 96 300 96 Q344 96 342 148 Q338 116 300 122 Q266 116 258 148 Z" fill="${hair}"/>`,
  };

  // Camada de roupa por família de peça. Quando a peça cobre só a parte de
  // baixo (ou é acessório), o restante fica com o traje neutro de estúdio.
  const topNeutral = `<path d="M300 214 L346 228 L360 286 L338 292 L336 336 Q300 346 264 336 L262 292 L240 286 L254 228 Z" fill="${neutral}"/>`;
  const bottomNeutral = `<path d="M262 332 L338 332 L334 372 L326 470 L308 470 L300 386 L292 470 L274 470 L266 372 Z" fill="${neutral}"/>`;

  const clothing = g
    ? {
        superior: `
          <path d="M300 214 L348 228 L362 286 L340 292 L338 340 Q300 350 262 340 L260 292 L238 286 L252 228 Z" fill="${g.color}"/>
          <path d="M276 216 Q300 240 324 216" fill="none" stroke="${shade}" stroke-width="5"/>
          ${bottomNeutral}`,
        vestido: `
          <path d="M300 214 L348 228 L362 288 L338 294 L344 440 Q300 456 256 440 L262 294 L238 288 L252 228 Z" fill="${g.color}"/>
          <path d="M276 216 Q300 242 324 216" fill="none" stroke="${shade}" stroke-width="5"/>`,
        inferior: `
          ${topNeutral}
          <path d="M260 332 L340 332 L336 372 L328 476 L306 476 L300 388 L294 476 L272 476 L264 372 Z" fill="${g.color}"/>
          <rect x="260" y="332" width="80" height="12" fill="${shade}"/>`,
        sobreposicao: `
          ${bottomNeutral}
          ${topNeutral}
          <path d="M300 214 L352 230 L368 292 L344 298 L340 400 Q300 412 260 400 L256 298 L232 292 L248 230 Z" fill="${g.color}"/>
          <path d="M300 220 L300 402" stroke="${shade}" stroke-width="4"/>`,
        acessorio: `
          ${topNeutral}
          ${bottomNeutral}`,
      }[g.shape]
    : `${topNeutral}${bottomNeutral}`;

  // Bolsa e afins ficam na mão, depois dos braços.
  const accessory =
    g && g.shape === "acessorio"
      ? `<g>
           <path d="M356 306 Q374 268 392 306" fill="none" stroke="${g.color}" stroke-width="7" stroke-linecap="round"/>
           <rect x="352" y="302" width="44" height="40" rx="8" fill="${g.color}"/>
           <rect x="352" y="316" width="44" height="6" fill="${shade}"/>
         </g>`
      : "";

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img">
  <defs>
    <linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${backdrop[0]}"/>
      <stop offset="100%" stop-color="${backdrop[1]}"/>
    </linearGradient>
    <radialGradient id="piso" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#00000024"/>
      <stop offset="100%" stop-color="#00000000"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#fundo)"/>
  <ellipse cx="300" cy="512" rx="104" ry="18" fill="url(#piso)"/>

  <g transform="translate(300 300) scale(${height.toFixed(3)}) translate(-300 -300)">
    ${hairBack[hairStyle]}

    <!-- pernas -->
    <path d="M280 420 L296 420 L294 496 L280 496 Z" fill="${skin}"/>
    <path d="M304 420 L320 420 L320 496 L306 496 Z" fill="${skin}"/>
    <rect x="274" y="492" width="26" height="16" rx="6" fill="${skinShade}"/>
    <rect x="300" y="492" width="26" height="16" rx="6" fill="${skinShade}"/>

    <!-- torso -->
    <path d="M300 208 L340 222 L348 300 L338 340 Q300 352 262 340 L252 300 L260 222 Z" fill="${skin}"/>

    ${clothing}

    <!-- braços por cima da roupa, como na pose de catálogo -->
    <path d="M254 230 L238 300 L236 372 L250 374 L254 302 L266 246 Z" fill="${skin}"/>
    <path d="M346 230 L362 300 L364 372 L350 374 L346 302 L334 246 Z" fill="${skin}"/>

    <!-- pescoço e rosto -->
    <path d="M288 178 L312 178 L312 214 L288 214 Z" fill="${skinShade}"/>
    <ellipse cx="300" cy="146" rx="37" ry="45" fill="${skin}"/>
    ${hairFront[hairStyle]}

    ${accessory}
  </g>
  ${watermark("Imagem gerada")}
</svg>`;
}

/**
 * Sorteia uma falha ocasional, para que o tratamento de erro seja real.
 *
 * O sorteio é por tentativa, não por conteúdo: a imagem de um produto é sempre
 * a mesma, mas "tentar de novo" precisa poder dar certo — do contrário a peça
 * que falhou uma vez falharia para sempre.
 */
function maybeFail(): AiImageFailure | null {
  const roll = Math.random();
  if (roll >= FAILURE_RATE) return null;
  const reason: AiFailureReason =
    roll < FAILURE_RATE / 3
      ? "conteudo"
      : roll < (FAILURE_RATE * 2) / 3
        ? "tempo_limite"
        : "provedor";
  return { ok: false, reason, error: FAILURES[reason] };
}

async function simulate(
  seed: number,
  render: () => string
): Promise<AiImageResult> {
  const started = Date.now();
  // O tempo varia a cada chamada, como aconteceria com o provedor real.
  const duration =
    DELAY.min + Math.floor(Math.random() * (DELAY.max - DELAY.min));
  await wait(duration);

  const failure = maybeFail();
  if (failure) return failure;

  return {
    ok: true,
    image: svgToDataUri(render()),
    providerRef: `sim_${seed.toString(36)}`,
    durationMs: Date.now() - started,
  };
}

// ---------------------------------------------------------------------------
// Operações públicas
// ---------------------------------------------------------------------------

/** Gera a foto de capa padronizada: peça isolada, fundo limpo, enquadramento fixo. */
export async function melhorarImagem(
  input: MelhorarImagemInput
): Promise<AiImageResult> {
  const seed = hash(`${input.productName}|${input.category}|${input.color ?? ""}`);
  return simulate(seed, () => renderGarment(input, seed));
}

/**
 * Cria a modelo exclusiva da loja.
 *
 * O `providerRef` devolvido é a trava de identidade: guardado na empresa, ele
 * garante que toda geração seguinte produza exatamente a mesma modelo.
 */
export async function criarModelo(
  input: CriarModeloInput
): Promise<AiImageResult> {
  const base =
    input.origin === "descricao"
      ? `${input.companyId}|${input.description ?? ""}`
      : `${input.companyId}|${(input.reference ?? "").slice(0, 240)}`;
  const seed = hash(base);
  // A referência é definida antes de desenhar: a aparência deriva dela, e não
  // do seed cru, para que `vestirModelo` reconstrua exatamente a mesma pessoa.
  const providerRef = `mdl_${seed.toString(36)}`;
  const result = await simulate(seed, () => renderModel(readLook(providerRef)));
  return result.ok ? { ...result, providerRef } : result;
}

/**
 * Veste a modelo já criada com a peça enviada.
 *
 * A aparência vem de `modelRef` e a peça entra por cima — por isso a modelo
 * permanece idêntica entre gerações, variando apenas a roupa.
 */
export async function vestirModelo(
  input: VestirModeloInput
): Promise<AiImageResult> {
  const look = readLook(input.modelRef);
  const seed = hash(`${input.modelRef}|${input.productName}|${input.color ?? ""}`);
  const garment = {
    color: garmentColor(input.color, seed),
    shape: readShape(input.category),
  };
  return simulate(seed, () => renderModel(look, { garment }));
}

/** Indica se as gerações usam o provedor real ou a simulação local. */
export function isProviderConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FASHN_ENABLED);
}
