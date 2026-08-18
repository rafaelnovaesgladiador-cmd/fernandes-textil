"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatNumber } from "@/lib/format";
import type { ProductStockAnalysis } from "@/lib/metrics";

const ABC_HINT = {
  A: "Classe A — está entre os produtos que geram 80% do faturamento. Não pode faltar.",
  B: "Classe B — giro intermediário. Reponha com atenção ao capital investido.",
  C: "Classe C — pouca representatividade no faturamento. Evite recompra grande.",
} as const;

const ABC_VARIANT = {
  A: "success",
  B: "warning",
  C: "secondary",
} as const;

/**
 * Traduz os números em uma frase de decisão: o que a lojista precisa saber é
 * se repõe, se segura a compra ou se coloca a peça em promoção.
 */
function interpretation(analysis: ProductStockAnalysis): string {
  const { sold90, monthlyAverage, coverageDays, stock, daysSinceLastSale } =
    analysis;

  if (sold90 === 0) {
    return stock > 0
      ? `Está há ${formatNumber(daysSinceLastSale)} dias sem vender, com ${formatNumber(
          stock
        )} peças paradas (${formatBRL(analysis.stockCost)} de capital imobilizado). Considere promoção ou troca com o fornecedor.`
      : `Está há ${formatNumber(daysSinceLastSale)} dias sem vender e sem estoque. Avalie se vale recomprar.`;
  }

  const average = monthlyAverage.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  if (stock === 0) {
    return `Vende em média ${average} peças por mês, mas está sem estoque — cada dia parado é venda perdida.`;
  }

  if (coverageDays === null) {
    return `Vende em média ${average} peças por mês e tem ${formatNumber(stock)} peças disponíveis.`;
  }

  const urgency =
    coverageDays < 15
      ? " No ritmo atual, é hora de repor."
      : coverageDays > 120
        ? " A cobertura está alta: o estoque demora a girar."
        : "";

  return `Vende em média ${average} peças por mês e tem estoque para cerca de ${formatNumber(
    coverageDays
  )} dias.${urgency}`;
}

export function ProductPerformanceTab({
  analysis,
  revenue90,
  profit90,
}: {
  analysis: ProductStockAnalysis;
  revenue90: number;
  profit90: number;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Últimos 90 dias</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric
            label="Unidades vendidas"
            value={formatNumber(analysis.sold90)}
          />
          <Metric label="Faturamento gerado" value={formatBRL(revenue90)} />
          <Metric label="Lucro gerado" value={formatBRL(profit90)} />
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Curva ABC
            </p>
            <div className="mt-2">
              <Badge variant={ABC_VARIANT[analysis.abcClass]}>
                Classe {analysis.abcClass}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leitura do giro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{interpretation(analysis)}</p>
          <p className="text-muted-foreground">
            {ABC_HINT[analysis.abcClass]}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
