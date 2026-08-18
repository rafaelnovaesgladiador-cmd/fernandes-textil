"use client";

import {
  criarModelo,
  melhorarImagem,
  vestirModelo,
  type AiImageResult,
  type ModeloOrigem,
} from "@/lib/ai/images";
import { demoUser } from "@/lib/mock";
import type {
  AiGeneration,
  AiGenerationKind,
  StoreModel,
} from "@/lib/types";
import { AI_GENERATION_LABELS } from "@/lib/types";
import type { AppState } from "./state";
import { bumpCounter, getState, setState } from "./store";

/**
 * Ações do estúdio de imagens.
 *
 * Cada geração é uma operação de negócio completa: reserva o crédito, chama a
 * camada de serviço, guarda o resultado no lugar certo e registra a auditoria.
 * Se o provedor falhar, o crédito volta para a empresa — só cobra o que
 * entregou. A interface nunca fala com o provedor diretamente.
 */

/** Saldo disponível para gerar. */
export function remainingCredits(state: AppState): number {
  return Math.max(0, state.aiCredits.granted - state.aiCredits.used);
}

export interface AiActionResult {
  ok: boolean;
  image?: string;
  error?: string;
}

const SEM_CREDITO =
  "Seus créditos de geração acabaram. Adicione créditos para continuar criando imagens.";

/**
 * Reserva um crédito antes de chamar o provedor.
 *
 * A cobrança acontece na largada para evitar que duas gerações simultâneas
 * gastem o mesmo saldo; o estorno vem depois, se a geração falhar.
 */
function reserveCredit(): boolean {
  let reserved = false;
  setState((state) => {
    if (remainingCredits(state) <= 0) return state;
    reserved = true;
    return {
      ...state,
      aiCredits: { ...state.aiCredits, used: state.aiCredits.used + 1 },
    };
  });
  return reserved;
}

function refundCredit(): void {
  setState((state) => ({
    ...state,
    aiCredits: {
      ...state.aiCredits,
      used: Math.max(0, state.aiCredits.used - 1),
    },
  }));
}

/** Registra a geração (concluída ou falha) e a entrada de auditoria. */
function recordGeneration(input: {
  kind: AiGenerationKind;
  subject: string;
  result: AiImageResult;
  productId?: string;
  modelId?: string;
  /** Alterações adicionais no estado quando a geração dá certo. */
  onSuccess?: (state: AppState, image: string) => Partial<AppState>;
}): void {
  setState((state) => {
    let counters = bumpCounter(state.counters, "gen");
    const date = new Date().toISOString();
    const success = input.result.ok;

    const generation: AiGeneration = {
      id: `gen_${String(counters["gen"]).padStart(4, "0")}`,
      companyId: state.companyId,
      kind: input.kind,
      status: success ? "concluida" : "falhou",
      productId: input.productId,
      modelId: input.modelId,
      image: success ? input.result.image : undefined,
      subject: input.subject,
      creditsUsed: success ? 1 : 0,
      error: success ? undefined : input.result.error,
      durationMs: success ? input.result.durationMs : undefined,
      createdAt: date,
    };

    counters = bumpCounter(counters, "log");
    const label = AI_GENERATION_LABELS[input.kind];
    const detail = success
      ? `${label}: ${input.subject} — 1 crédito consumido`
      : `${label}: ${input.subject} — falhou, crédito devolvido`;

    const extra =
      success && input.onSuccess
        ? input.onSuccess(state, input.result.image)
        : {};

    return {
      ...state,
      ...extra,
      aiGenerations: [generation, ...state.aiGenerations],
      activityLog: [
        {
          id: `log_${String(counters["log"]).padStart(4, "0")}`,
          companyId: state.companyId,
          userId: demoUser.id,
          userName: demoUser.name,
          action: success ? "Imagem gerada" : "Geração de imagem falhou",
          entity: "Estúdio",
          detail,
          date,
        },
        ...state.activityLog,
      ],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// Recurso 1 — foto de capa padronizada
// ---------------------------------------------------------------------------

export interface EnhancePhotoInput {
  productId: string;
  /** Foto enviada pela lojista (data URI). */
  source: string;
}

export async function enhanceProductPhoto(
  input: EnhancePhotoInput
): Promise<AiActionResult> {
  const state = getState();
  const product = state.products.find((p) => p.id === input.productId);
  if (!product) return { ok: false, error: "Produto não encontrado." };

  if (!reserveCredit()) return { ok: false, error: SEM_CREDITO };

  const variantColor = state.variants.find(
    (v) => v.productId === product.id
  )?.color;

  const result = await melhorarImagem({
    source: input.source,
    productName: product.name,
    category: product.category,
    color: variantColor,
  });

  if (!result.ok) {
    refundCredit();
    recordGeneration({
      kind: "melhoria",
      subject: product.name,
      productId: product.id,
      result,
    });
    return { ok: false, error: result.error };
  }

  recordGeneration({
    kind: "melhoria",
    subject: product.name,
    productId: product.id,
    result,
    onSuccess: (current, image) => ({
      products: current.products.map((p) =>
        p.id === input.productId
          ? { ...p, sourcePhoto: input.source, coverImage: image }
          : p
      ),
    }),
  });

  return { ok: true, image: result.image };
}

// ---------------------------------------------------------------------------
// Recurso 2 — modelo exclusiva da loja
// ---------------------------------------------------------------------------

export interface CreateStoreModelInput {
  name: string;
  origin: ModeloOrigem;
  description?: string;
  /** Imagem de referência (data URI), quando a origem é "imagem". */
  reference?: string;
}

export async function createStoreModel(
  input: CreateStoreModelInput
): Promise<AiActionResult> {
  const state = getState();
  if (!reserveCredit()) return { ok: false, error: SEM_CREDITO };

  const result = await criarModelo({
    companyId: state.companyId,
    name: input.name,
    origin: input.origin,
    description: input.description,
    reference: input.reference,
  });

  if (!result.ok) {
    refundCredit();
    recordGeneration({ kind: "modelo", subject: input.name, result });
    return { ok: false, error: result.error };
  }

  const providerRef = result.providerRef;
  const modelId = `mod_${providerRef.replace(/^mdl_/, "")}`;

  recordGeneration({
    kind: "modelo",
    subject: input.name,
    modelId,
    result,
    onSuccess: (current, image) => {
      const model: StoreModel = {
        id: modelId,
        companyId: current.companyId,
        name: input.name,
        origin: input.origin,
        description: input.description,
        image,
        providerRef,
        createdAt: new Date().toISOString(),
      };
      // Trocar a modelo invalida as provas anteriores: as imagens ficam na
      // galeria como histórico, mas saem dos produtos para não misturar
      // pessoas diferentes na mesma vitrine.
      return {
        storeModel: model,
        products: current.products.map((p) =>
          p.tryOnImage ? { ...p, tryOnImage: undefined } : p
        ),
      };
    },
  });

  return { ok: true, image: result.image };
}

/** Remove a modelo da loja e as provas geradas com ela. */
export function removeStoreModel(): void {
  setState((state) => {
    if (!state.storeModel) return state;
    const counters = bumpCounter(state.counters, "log");
    return {
      ...state,
      storeModel: null,
      products: state.products.map((p) =>
        p.tryOnImage ? { ...p, tryOnImage: undefined } : p
      ),
      activityLog: [
        {
          id: `log_${String(counters["log"]).padStart(4, "0")}`,
          companyId: state.companyId,
          userId: demoUser.id,
          userName: demoUser.name,
          action: "Modelo removida",
          entity: "Estúdio",
          detail: `${state.storeModel.name} — as provas geradas com ela saíram dos produtos`,
          date: new Date().toISOString(),
        },
        ...state.activityLog,
      ],
      counters,
    };
  });
}

// ---------------------------------------------------------------------------
// Recurso 3 — provador
// ---------------------------------------------------------------------------

export interface TryOnInput {
  productId: string;
  /** Foto da peça. Sem ela, usa a foto já guardada no produto. */
  garment?: string;
}

export async function generateTryOn(
  input: TryOnInput
): Promise<AiActionResult> {
  const state = getState();
  const model = state.storeModel;
  if (!model) {
    return {
      ok: false,
      error: "Crie a modelo da loja antes de usar o provador.",
    };
  }

  const product = state.products.find((p) => p.id === input.productId);
  if (!product) return { ok: false, error: "Produto não encontrado." };

  const garment = input.garment ?? product.coverImage ?? product.sourcePhoto;
  if (!garment) {
    return {
      ok: false,
      error: "Envie a foto da peça para gerar a imagem no provador.",
    };
  }

  if (!reserveCredit()) return { ok: false, error: SEM_CREDITO };

  const variantColor = state.variants.find(
    (v) => v.productId === product.id
  )?.color;

  const result = await vestirModelo({
    modelRef: model.providerRef,
    garment,
    productName: product.name,
    category: product.category,
    color: variantColor,
  });

  if (!result.ok) {
    refundCredit();
    recordGeneration({
      kind: "provador",
      subject: product.name,
      productId: product.id,
      modelId: model.id,
      result,
    });
    return { ok: false, error: result.error };
  }

  recordGeneration({
    kind: "provador",
    subject: product.name,
    productId: product.id,
    modelId: model.id,
    result,
    onSuccess: (current, image) => ({
      products: current.products.map((p) =>
        p.id === input.productId ? { ...p, tryOnImage: image } : p
      ),
    }),
  });

  return { ok: true, image: result.image };
}

// ---------------------------------------------------------------------------
// Créditos
// ---------------------------------------------------------------------------

/**
 * Concede créditos à empresa.
 *
 * Na demonstração serve para destravar o fluxo depois que a cota zera; em
 * produção este é o ponto em que a compra de um pacote entra no saldo.
 */
export function grantCredits(amount: number): void {
  setState((state) => ({
    ...state,
    aiCredits: {
      ...state.aiCredits,
      granted: state.aiCredits.granted + Math.max(0, amount),
    },
  }));
}
