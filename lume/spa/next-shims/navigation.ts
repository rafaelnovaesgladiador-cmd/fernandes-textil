"use client";

import { useSyncExternalStore } from "react";

/**
 * Roteador da versão SPA (demonstração publicável).
 *
 * Entrega a mesma API de `next/navigation` sobre navegação por hash
 * (`#/produtos/prd_001?filtro=parados`), incluindo rotas com parâmetros e
 * query string — assim nenhum componente da aplicação precisa ser alterado.
 * O esbuild aponta "next/navigation" para cá no build da demo.
 */

const listeners = new Set<() => void>();

function currentHash(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.length > 0 ? hash : "/";
}

let snapshot = typeof window === "undefined" ? "/" : currentHash();

function emit() {
  const next = currentHash();
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

/** Caminho completo do hash, com query string. */
function useHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => "/"
  );
}

export function usePathname(): string {
  return useHash().split("?")[0];
}

export function useSearchParams(): URLSearchParams {
  const query = useHash().split("?")[1] ?? "";
  return new URLSearchParams(query);
}

/**
 * Parâmetros da rota atual. O `main.tsx` publica os valores casados no momento
 * do render, já que aqui não existe o roteador de arquivos do Next.
 */
let routeParams: Record<string, string> = {};

export function setRouteParams(params: Record<string, string>) {
  routeParams = params;
}

export function useParams<
  T extends Record<string, string> = Record<string, string>,
>(): T {
  // Assinar o hash garante nova leitura quando a rota muda.
  useHash();
  return routeParams as T;
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
  // hashchange é assíncrono; sincroniza já para evitar um quadro com o
  // caminho antigo em telas que redirecionam durante a montagem.
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
