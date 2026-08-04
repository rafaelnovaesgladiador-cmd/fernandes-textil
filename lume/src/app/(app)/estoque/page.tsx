"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChartColumn, History, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AnalisesTab, type AnaliseSection } from "@/components/estoque/analises-tab";
import { MovimentacoesTab } from "@/components/estoque/movimentacoes-tab";
import { PosicaoTab } from "@/components/estoque/posicao-tab";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/hooks/use-store";
import { formatBRL, formatNumber } from "@/lib/format";
import { stockSummary } from "@/lib/metrics";

type TabKey = "posicao" | "analises" | "movimentacoes";

const TAB_KEYS: TabKey[] = ["posicao", "analises", "movimentacoes"];

/**
 * Módulo de Estoque.
 *
 * Três leituras da mesma base: onde o estoque está hoje (Posição), o que ele
 * diz sobre o negócio (Análises) e como ele chegou até aqui (Movimentações).
 * A aba vive na URL, então os alertas conseguem abrir a análise certa mesmo
 * com a página já aberta.
 */
export default function EstoquePage() {
  return (
    <Suspense fallback={<EstoqueSkeleton />}>
      <EstoqueContent />
    </Suspense>
  );
}

function EstoqueContent() {
  const state = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const analise = searchParams.get("analise");
  const highlight: AnaliseSection | null =
    analise === "parados" || analise === "reposicao" ? analise : null;

  const aba = searchParams.get("aba");
  const tab: TabKey = TAB_KEYS.includes(aba as TabKey)
    ? (aba as TabKey)
    : highlight
      ? "analises"
      : "posicao";

  // A troca de aba reescreve a URL: sai o destaque vindo do alerta e a
  // navegação do celular (voltar) continua fazendo sentido.
  const handleTabChange = (value: string) => {
    router.replace(value === "posicao" ? "/estoque" : `/estoque?aba=${value}`);
  };

  const summary = useMemo(() => stockSummary(state), [state]);
  const activeProducts = state.products.filter((p) => p.status === "ativo").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Estoque"
        description={`${formatNumber(activeProducts)} produtos ativos · ${formatNumber(
          summary.totalPieces
        )} peças · ${formatBRL(summary.stockCost)} investidos em mercadoria`}
      />

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="posicao">
            <Package />
            Posição
          </TabsTrigger>
          <TabsTrigger value="analises">
            <ChartColumn />
            Análises
          </TabsTrigger>
          <TabsTrigger value="movimentacoes">
            <History />
            Movimentações
            {state.stockMovements.length > 0 ? (
              <Badge variant="secondary">
                {formatNumber(state.stockMovements.length)}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posicao">
          <PosicaoTab state={state} />
        </TabsContent>
        <TabsContent value="analises">
          <AnalisesTab state={state} highlight={highlight} />
        </TabsContent>
        <TabsContent value="movimentacoes">
          <MovimentacoesTab state={state} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EstoqueSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando estoque">
      <Skeleton className="h-14 w-72" />
      <Skeleton className="h-9 w-80" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-27" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
