"use client";

import { useSyncExternalStore } from "react";

/**
 * Store externo baseado em localStorage, seguro para SSR/hidratação:
 * o servidor enxerga sempre o valor padrão e o cliente sincroniza após
 * montar, sem setState dentro de effects.
 */
export function createLocalStore<T>(
  key: string,
  parse: (raw: string | null) => T,
  serverValue: T
) {
  const listeners = new Set<() => void>();
  let hasCache = false;
  let cachedRaw: string | null = null;
  let cachedValue: T = serverValue;

  const getSnapshot = (): T => {
    const raw = window.localStorage.getItem(key);
    if (!hasCache || raw !== cachedRaw) {
      hasCache = true;
      cachedRaw = raw;
      cachedValue = parse(raw);
    }
    return cachedValue;
  };

  const emit = () => listeners.forEach((listener) => listener());

  return {
    subscribe(callback: () => void) {
      listeners.add(callback);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) callback();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(callback);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot,
    getServerSnapshot: () => serverValue,
    write(raw: string | null) {
      if (raw === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, raw);
      emit();
    },
  };
}

const emptySubscribe = () => () => {};

/** true somente após a hidratação no cliente. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
