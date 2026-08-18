"use client";

import { useMemo } from "react";
import { buildAlerts } from "@/lib/alerts";
import { useStore } from "./use-store";
import type { Alert } from "@/lib/types";

export const ALERT_PRIORITY_ORDER: Record<Alert["priority"], number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export const ALERT_PRIORITY_VARIANT = {
  baixa: "secondary",
  media: "warning",
  alta: "serious",
  critica: "critical",
} as const;

/** Alertas recalculados a cada mudança no estado da loja. */
export function useAlerts(): Alert[] {
  const state = useStore();
  return useMemo(() => buildAlerts(state), [state]);
}

export function useOpenAlerts(): Alert[] {
  const alerts = useAlerts();
  return useMemo(
    () =>
      alerts
        .filter((alert) => alert.status === "aberto")
        .sort(
          (a, b) =>
            ALERT_PRIORITY_ORDER[a.priority] - ALERT_PRIORITY_ORDER[b.priority]
        ),
    [alerts]
  );
}
