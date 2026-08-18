"use client";

import { useSyncExternalStore } from "react";
import { getServerState, getState, subscribe } from "@/lib/store/store";
import type { AppState } from "@/lib/store/state";

/** Estado completo da loja, reativo a qualquer alteração. */
export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

/**
 * Recorte do estado. O seletor roda a cada notificação, então deve devolver
 * um valor estável (primitivo ou referência preservada) para evitar renders
 * desnecessários — cálculos derivados ficam em `useMemo` na tela.
 */
export function useStoreSelector<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(getServerState())
  );
}
