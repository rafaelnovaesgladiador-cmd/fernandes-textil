"use client";

import { createSeedState, STATE_VERSION, type AppState } from "./state";

/**
 * Store da aplicação: estado imutável, persistido no navegador.
 *
 * Na Etapa 5 este módulo passa a conversar com o Supabase — as telas usam
 * `useStore`/`useStoreSelector` e as ações de `actions.ts`, então a troca da
 * origem dos dados não alcança a camada de interface.
 */

const STORAGE_KEY = "lume.data.v1";

let state: AppState = createSeedState();
let hydrated = false;
const listeners = new Set<() => void>();

/** Estado usado durante a renderização no servidor (sempre o seed). */
const serverState = state;

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Cota excedida ou navegação privativa: o app segue com o estado em
    // memória, apenas sem sobreviver ao recarregamento.
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as AppState;
    if (saved?.version === STATE_VERSION) {
      state = saved;
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getState(): AppState {
  hydrate();
  return state;
}

export function getServerState(): AppState {
  return serverState;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aplica uma transformação ao estado e notifica os assinantes. */
export function setState(updater: (current: AppState) => AppState): void {
  hydrate();
  state = updater(state);
  persist();
  listeners.forEach((listener) => listener());
}

/** Restaura a base de demonstração original. */
export function resetState(): void {
  state = createSeedState();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora indisponibilidade do armazenamento
  }
  listeners.forEach((listener) => listener());
}

/** Identificador sequencial e legível por tipo de entidade (ex.: "ven_0042"). */
export function nextId(prefix: string, current: AppState): string {
  const value = (current.counters[prefix] ?? 0) + 1;
  return `${prefix}_${String(value).padStart(4, "0")}`;
}

export function bumpCounter(
  counters: AppState["counters"],
  prefix: string
): AppState["counters"] {
  return { ...counters, [prefix]: (counters[prefix] ?? 0) + 1 };
}
