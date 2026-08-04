"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBRL, formatPercent } from "@/lib/format";
import { incomeStatement, resolvePeriod, type PeriodKey } from "@/lib/metrics";
import type { AppState } from "@/lib/store";
import { cn } from "@/lib/utils";

type DrePeriod = Extract<PeriodKey, "mes" | "mes_anterior" | "30d">;

const PERIOD_OPTIONS: Array<{ value: DrePeriod; label: string }> = [
  { value: "mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "30d", label: "Últimos 30 dias" },
];

/** Começa em 30 dias: no início do mês o recorte "este mês" ainda não diz nada. */
const DEFAULT_PERIOD: DrePeriod = "30d";

type LineKind = "entrada" | "deducao" | "subtotal" | "resultado" | "informativo";

interface DreLine {
  id: string;
  label: string;
  value: number;
  kind: LineKind;
  hint?: string;
}

const PREFIX: Record<LineKind, string> = {
  entrada: "",
  deducao: "(−)",
  subtotal: "(=)",
  resultado: "(=)",
  informativo: "(i)",
};

/**
 * DRE em cascata — do faturamento bruto ao lucro líquido, linha a linha.
 * O percentual é sempre sobre a receita líquida, que é a base de comparação
 * usada no varejo.
 */
export function DreTab({ state }: { state: AppState }) {
  const [period, setPeriod] = useState<DrePeriod>(DEFAULT_PERIOD);

  const { dre, periodLabel } = useMemo(() => {
    const range = resolvePeriod(period).current;
    return {
      dre: incomeStatement(state, range),
      periodLabel:
        PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "",
    };
  }, [state, period]);

  const lines: DreLine[] = [
    {
      id: "gross",
      label: "Faturamento bruto",
      value: dre.grossRevenue,
      kind: "entrada",
      hint: "Soma das vendas do período pelo preço de etiqueta, antes dos descontos.",
    },
    {
      id: "discounts",
      label: "Descontos concedidos",
      value: -dre.discounts,
      kind: "deducao",
      hint: "Tudo que você abateu no fechamento das vendas.",
    },
    {
      id: "returns",
      label: "Devoluções",
      value: -dre.returns,
      kind: "informativo",
      hint: "Vendas devolvidas no período. Já estão fora do faturamento acima — aparecem aqui para você acompanhar o tamanho do problema.",
    },
    {
      id: "net",
      label: "Receita líquida",
      value: dre.netRevenue,
      kind: "subtotal",
      hint: "O que a loja de fato vendeu, já sem os descontos. É a base dos percentuais desta tabela.",
    },
    {
      id: "cogs",
      label: "CMV — custo das peças vendidas",
      value: -dre.cogs,
      kind: "deducao",
      hint: "Quanto você pagou ao fornecedor pelas peças que saíram no período.",
    },
    {
      id: "grossProfit",
      label: "Lucro bruto",
      value: dre.grossProfit,
      kind: "subtotal",
      hint: "Receita líquida menos o custo das peças. É o dinheiro que sobra para pagar a operação.",
    },
    {
      id: "opex",
      label: "Despesas operacionais",
      value: -dre.operatingExpenses,
      kind: "deducao",
      hint: "Aluguel, salários, energia, marketing, embalagens — o custo de manter a loja aberta.",
    },
    {
      id: "cardFees",
      label: "Taxas de cartão",
      value: -dre.cardFees,
      kind: "deducao",
      hint: "O que a maquininha fica de cada venda no crédito e no débito.",
    },
    {
      id: "commissions",
      label: "Comissões das vendedoras",
      value: -dre.commissions,
      kind: "deducao",
      hint: "Calculadas sobre as vendas do período pela regra de cada vendedora.",
    },
    {
      id: "taxes",
      label: "Impostos",
      value: -dre.taxes,
      kind: "deducao",
      hint: "Simples Nacional e demais tributos lançados no período.",
    },
    {
      id: "netProfit",
      label: "Lucro líquido",
      value: dre.netProfit,
      kind: "resultado",
      hint: "O que realmente sobrou para você. Se for negativo, a loja gastou mais do que vendeu no período.",
    },
  ];

  const share = (value: number) =>
    dre.netRevenue > 0 ? (value / dre.netRevenue) * 100 : 0;

  const profitPer100 = dre.netRevenue > 0 ? (dre.netProfit / dre.netRevenue) * 100 : 0;

  const exportAs = (format: "PDF" | "Excel") => {
    toast.success(`Exportação em ${format} gerada`, {
      description:
        "Demonstração: o arquivo não é baixado nesta versão — a geração real do relatório entra na próxima etapa.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-56">
          <Label htmlFor="dre-period" className="mb-1.5 text-xs text-muted-foreground">
            Período
          </Label>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as DrePeriod)}
          >
            <SelectTrigger id="dre-period" size="sm" className="w-full">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportAs("PDF")}>
            <FileText /> Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAs("Excel")}>
            <FileSpreadsheet /> Exportar Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo de resultado — {periodLabel}</CardTitle>
          <CardDescription>
            Do que entrou até o que sobrou. O percentual de cada linha é sobre a
            receita líquida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="hidden grid-cols-[1fr_9rem_5rem] gap-2 px-3 pb-1 text-xs font-medium text-muted-foreground sm:grid">
            <span>Linha</span>
            <span className="text-right">Valor</span>
            <span className="text-right">% da receita</span>
          </div>

          {lines.map((line) => {
            const isSubtotal = line.kind === "subtotal";
            const isResult = line.kind === "resultado";
            const isInfo = line.kind === "informativo";
            const percent = share(line.value);

            return (
              <div
                key={line.id}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-sm sm:grid-cols-[1fr_9rem_5rem]",
                  isSubtotal && "bg-secondary/60 font-semibold",
                  isResult &&
                    (line.value >= 0
                      ? "border border-success/40 bg-success/10 font-semibold"
                      : "border border-critical/40 bg-critical/10 font-semibold"),
                  isInfo && "text-muted-foreground"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn(
                      "w-7 shrink-0 tabular-nums text-xs",
                      isSubtotal || isResult
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {PREFIX[line.kind]}
                  </span>
                  <span className={cn(!isSubtotal && !isResult && "text-foreground")}>
                    {line.label}
                  </span>
                  {line.hint ? (
                    <Tooltip>
                      <TooltipTrigger
                        aria-label={`O que é ${line.label}`}
                        className="cursor-help rounded-sm text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <Info className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent>{line.hint}</TooltipContent>
                    </Tooltip>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-right tabular-nums",
                    isResult && (line.value >= 0 ? "text-success-text" : "text-critical")
                  )}
                >
                  {formatBRL(line.value)}
                </span>
                <span className="col-span-2 text-right text-xs tabular-nums text-muted-foreground sm:col-span-1">
                  {dre.netRevenue > 0 ? formatPercent(percent, 1) : "—"}
                </span>
              </div>
            );
          })}

          <div className="mt-3 rounded-lg border border-dashed p-3 text-sm">
            <p className="font-medium">Traduzindo para o balcão</p>
            <p className="mt-1 text-muted-foreground">
              De cada {formatBRL(100)} vendidos no período,{" "}
              <strong
                className={cn(
                  "font-semibold",
                  dre.netProfit >= 0 ? "text-success-text" : "text-critical"
                )}
              >
                {formatBRL(profitPer100)}
              </strong>{" "}
              {dre.netProfit >= 0 ? "sobraram como lucro" : "faltaram para fechar a conta"}{" "}
              — margem líquida de {formatPercent(dre.netMargin, 1)}. O custo das peças
              levou {formatPercent(share(dre.cogs), 1)} e as despesas da operação,{" "}
              {formatPercent(
                share(dre.operatingExpenses + dre.cardFees + dre.commissions + dre.taxes),
                1
              )}
              .
            </p>
          </div>

          <p className="pt-1 text-xs text-muted-foreground">
            DRE simplificada, feita para decisão de loja — não substitui a
            contabilidade oficial.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
