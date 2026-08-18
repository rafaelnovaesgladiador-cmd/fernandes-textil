"use client";

import { useEffect, useMemo, useRef } from "react";
import { stockAnalysis } from "@/lib/metrics";
import type { AppState } from "@/lib/store/state";
import { cn } from "@/lib/utils";
import { CurvaAbcCard } from "./curva-abc-card";
import { DistribuicaoCards } from "./distribuicao-cards";
import { ParadosCard } from "./parados-card";
import { ReposicaoCard } from "./reposicao-card";

export type AnaliseSection = "reposicao" | "parados";

const HIGHLIGHT = "ring-2 ring-primary";

/**
 * Aba Análises: as quatro leituras que transformam saldo em decisão —
 * curva ABC, reposição, capital parado e distribuição do estoque.
 */
export function AnalisesTab({
  state,
  highlight,
}: {
  state: AppState;
  highlight: AnaliseSection | null;
}) {
  const analysis = useMemo(() => stockAnalysis(state), [state]);
  const reposicaoRef = useRef<HTMLElement>(null);
  const paradosRef = useRef<HTMLElement>(null);

  // Links vindos dos alertas (?analise=parados|reposicao) abrem a seção
  // correspondente já rolada; o destaque sai quando a aba muda.
  useEffect(() => {
    if (!highlight) return;
    const target = highlight === "parados" ? paradosRef : reposicaoRef;
    target.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlight]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Leituras dos últimos 90 dias de venda: o que sustenta o faturamento, o
        que está prestes a faltar, o que travou e como o estoque está
        distribuído.
      </p>

      <CurvaAbcCard analysis={analysis} />

      <section
        id="reposicao"
        ref={reposicaoRef}
        aria-label="Reposição de estoque"
        className="scroll-mt-24"
      >
        <ReposicaoCard
          state={state}
          analysis={analysis}
          className={cn(highlight === "reposicao" && HIGHLIGHT)}
        />
      </section>

      <section
        id="parados"
        ref={paradosRef}
        aria-label="Produtos parados"
        className="scroll-mt-24"
      >
        <ParadosCard
          analysis={analysis}
          className={cn(highlight === "parados" && HIGHLIGHT)}
        />
      </section>

      <DistribuicaoCards state={state} />
    </div>
  );
}
