"use client";

import * as React from "react";
import { useStore } from "@/hooks/use-store";
import { remainingCredits } from "@/lib/store";
import { CreditsPanel } from "./credits-panel";
import { GenerationGallery } from "./generation-gallery";
import { StoreModelCard } from "./store-model-card";
import { TryOnPanel } from "./try-on-panel";

/**
 * Estúdio de imagens.
 *
 * A ordem da tela é a ordem da decisão: primeiro o saldo (posso gerar?),
 * depois a modelo (o ativo que destrava o provador), então o provador e, por
 * último, o histórico do que já foi gerado.
 */

const MODEL_SECTION = "estudio-modelo";

export function StudioTab({ initialProductId }: { initialProductId?: string }) {
  const state = useStore();
  const remaining = remainingCredits(state);

  const activeProducts = React.useMemo(
    () => state.products.filter((product) => product.status === "ativo"),
    [state.products]
  );

  const goToModel = () => {
    document
      .getElementById(MODEL_SECTION)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      <CreditsPanel credits={state.aiCredits} remaining={remaining} />

      <StoreModelCard
        model={state.storeModel}
        remaining={remaining}
        sectionId={MODEL_SECTION}
      />

      <TryOnPanel
        model={state.storeModel}
        products={activeProducts}
        remaining={remaining}
        initialProductId={initialProductId}
        onGoToModel={goToModel}
      />

      <GenerationGallery generations={state.aiGenerations} />
    </div>
  );
}
