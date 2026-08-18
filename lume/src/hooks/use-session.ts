"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore, useMounted } from "@/lib/client-store";

/**
 * Sessão simulada (Etapa 1): persiste no localStorage o estado de login,
 * a empresa selecionada e a conclusão do onboarding. Na Etapa 5 este hook
 * será substituído pela autenticação real do Supabase, mantendo a mesma
 * interface para o restante do app.
 */

const STORAGE_KEY = "lume.session.v1";

export interface SessionState {
  loggedIn: boolean;
  companyId?: string;
  onboardingDone: boolean;
}

const DEFAULT_SESSION: SessionState = {
  loggedIn: false,
  onboardingDone: false,
};

const store = createLocalStore<SessionState>(
  STORAGE_KEY,
  (raw) => {
    if (!raw) return DEFAULT_SESSION;
    try {
      return { ...DEFAULT_SESSION, ...(JSON.parse(raw) as Partial<SessionState>) };
    } catch {
      return DEFAULT_SESSION;
    }
  },
  DEFAULT_SESSION
);

function writeSession(patch: Partial<SessionState>) {
  const current =
    typeof window === "undefined" ? DEFAULT_SESSION : store.getSnapshot();
  store.write(JSON.stringify({ ...current, ...patch }));
}

export function useSession() {
  const session = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
  // `ready` evita redirecionos com o snapshot do servidor (deslogado).
  const ready = useMounted();

  const login = useCallback(() => writeSession({ loggedIn: true }), []);

  const selectCompany = useCallback(
    (companyId: string) => writeSession({ companyId, onboardingDone: true }),
    []
  );

  const completeOnboarding = useCallback(
    (companyId: string) => writeSession({ companyId, onboardingDone: true }),
    []
  );

  const logout = useCallback(() => store.write(null), []);

  return { session, ready, login, selectCompany, completeOnboarding, logout };
}
