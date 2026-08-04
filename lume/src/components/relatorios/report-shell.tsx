"use client";

import type { ReactNode } from "react";
import { FileSearch, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDeltaPercent } from "@/lib/format";
import { deltaPercent, type DateRange } from "@/lib/metrics";
import type { AppState } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Contrato comum dos relatórios.
 *
 * Cada relatório recebe o mesmo recorte (estado + período + período anterior)
 * e decide o que fazer com ele. Assim os números de qualquer relatório batem
 * com os do Dashboard: a fonte e o intervalo são exatamente os mesmos.
 */
export interface ReportContext {
  state: AppState;
  range: DateRange;
  previousRange: DateRange;
  /** Comparação com o período anterior ligada pelo usuário. */
  compare: boolean;
  compareLabel: string;
  periodLabel: string;
}

export interface ReportProps {
  ctx: ReportContext;
}

/** Bloco padrão de relatório: título, descrição e conteúdo. */
export function ReportCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className={action ? "flex-row items-start justify-between gap-3" : undefined}>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Grade dos totalizadores do relatório. */
export function ReportTotals({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Totalizadores do relatório"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {children}
    </section>
  );
}

/**
 * Totalizador com variação vs. período anterior — só mostra a comparação
 * quando o usuário liga o comparativo e existe base para comparar.
 */
export function ReportStat({
  label,
  value,
  current,
  previous,
  ctx,
  icon,
  hint,
  invertDelta,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  ctx: ReportContext;
  icon?: LucideIcon;
  hint?: string;
  invertDelta?: boolean;
}) {
  const showDelta =
    ctx.compare && current !== undefined && previous !== undefined;
  return (
    <StatCard
      label={label}
      value={value}
      icon={icon}
      hint={hint}
      invertDelta={invertDelta}
      delta={showDelta ? deltaPercent(current, previous) : undefined}
      deltaLabel={showDelta ? ctx.compareLabel : undefined}
    />
  );
}

/** Leitura do número: o que o dado indica e o que fazer com ele. */
export function ReportInsight({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-dashed bg-secondary/40 px-3.5 py-3">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

/** Variação percentual em linha de tabela: verde sobe, vermelho cai. */
export function DeltaTag({
  current,
  previous,
  invertDelta = false,
  className,
}: {
  current: number;
  previous: number;
  invertDelta?: boolean;
  className?: string;
}) {
  const delta = deltaPercent(current, previous);
  if (delta === null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {current > 0 ? "novo" : "—"}
      </span>
    );
  }
  const flat = Math.abs(delta) < 0.05;
  const good = invertDelta ? delta < 0 : delta > 0;
  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        flat
          ? "text-muted-foreground"
          : good
            ? "text-success-text"
            : "text-critical",
        className
      )}
    >
      {formatDeltaPercent(delta)}
    </span>
  );
}

/** Período sem dados para o relatório escolhido. */
export function ReportEmpty({
  title = "Sem dados neste período",
  description,
}: {
  title?: string;
  description: string;
}) {
  return <EmptyState icon={FileSearch} title={title} description={description} />;
}

/** Paleta fixa dos gráficos dos relatórios. */
export const REPORT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];
