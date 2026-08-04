"use client";

import { useSyncExternalStore } from "react";

/**
 * Roteador da versão SPA (demonstração publicável).
 *
 * O app Next usa apenas `usePathname` e `useRouter` — este módulo entrega a
 * mesma API sobre navegação por hash (`#/visao-geral`), para que nenhum
 * componente da aplicação precise ser alterado. O esbuild aponta
 * "next/navigation" para cá no build da demo.
 */

const listeners = new Set<() => void>();

function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.length > 0 ? hash : "/";
}

let snapshot = typeof window === "undefined" ? "/" : currentPath();

function emit() {
  const next = currentPath();
  if (next !== snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", emit);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => "/"
  );
}

export function navigate(href: string, replace = false) {
  const target = `#${href}`;
  if (replace) {
    window.location.replace(
      `${window.location.pathname}${window.location.search}${target}`
    );
  } else {
    window.location.hash = href;
  }
  // O evento hashchange é assíncrono; sincroniza já para evitar um quadro
  // com o caminho antigo em telas que redirecionam durante a montagem.
  queueMicrotask(emit);
  window.scrollTo({ top: 0 });
}

export function useRouter() {
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, true),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => {},
    prefetch: () => {},
  };
}
