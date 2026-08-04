"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isReportKey,
  reportByKey,
  type ReportKey,
} from "@/components/relatorios/report-registry";
import type { ReportContext } from "@/components/relatorios/report-shell";
import {
  ReportToolbar,
  type ExportKind,
  type SavedFilter,
} from "@/components/relatorios/report-toolbar";
import { useStore } from "@/hooks/use-store";
import { addDays } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { PERIOD_LABELS, resolvePeriod, type PeriodKey } from "@/lib/metrics";

const STORAGE_KEY = "lume:relatorios:filtros";
const MAX_SAVED = 6;

function isPeriodKey(value: unknown): value is PeriodKey {
  return typeof value === "string" && value in PERIOD_LABELS;
}

function isSavedFilter(value: unknown): value is SavedFilter {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    isReportKey(record.report) &&
    isPeriodKey(record.period) &&
    typeof record.compare === "boolean"
  );
}

function filterId(report: ReportKey, period: PeriodKey, compare: boolean) {
  return `${report}|${period}|${compare ? "cmp" : "solo"}`;
}

/** Filtros favoritos do usuário, guardados no próprio navegador. */
function readSavedFilters(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedFilter).slice(0, MAX_SAVED);
  } catch {
    // Preferência local corrompida: segue com a lista vazia.
    return [];
  }
}

/**
 * Central de relatórios.
 *
 * O período e a comparação são resolvidos uma única vez e entregues a cada
 * relatório pelo mesmo contrato — assim os números batem entre relatórios e
 * com o Dashboard.
 */
export default function RelatoriosPage() {
  return (
    <Suspense fallback={<RelatoriosSkeleton />}>
      <RelatoriosContent />
    </Suspense>
  );
}

function RelatoriosContent() {
  const state = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramReport = searchParams.get("relatorio");
  const [report, setReport] = useState<ReportKey>(() =>
    isReportKey(paramReport) ? paramReport : "vendas"
  );
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [compare, setCompare] = useState(true);
  const [saved, setSaved] = useState<SavedFilter[]>(readSavedFilters);
  const [loading, setLoading] = useState(false);
  const appliedParam = useRef<string | null>(null);

  // Link vindo de um alerta (?relatorio=descontos) abre o relatório certo.
  useEffect(() => {
    if (!isReportKey(paramReport)) return;
    if (paramReport === appliedParam.current) return;
    appliedParam.current = paramReport;
    setReport(paramReport);
  }, [paramReport]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 260);
    return () => clearTimeout(timer);
  }, [loading]);

  const persist = (next: SavedFilter[]) => {
    setSaved(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sem localStorage (aba privada): os filtros valem só nesta sessão.
    }
  };

  const changeReport = (key: ReportKey) => {
    appliedParam.current = key;
    setReport(key);
    setLoading(true);
    router.replace(`/relatorios?relatorio=${key}`, { scroll: false });
  };

  const changePeriod = (key: PeriodKey) => {
    setPeriod(key);
    setLoading(true);
  };

  const changeCompare = (value: boolean) => {
    setCompare(value);
    toast.success(
      value
        ? "Comparação com o período anterior ligada."
        : "Comparação desligada."
    );
  };

  const definition = reportByKey(report);

  const ctx = useMemo<ReportContext>(() => {
    const resolved = resolvePeriod(period);
    return {
      state,
      range: resolved.current,
      previousRange: resolved.previous,
      compare,
      compareLabel: resolved.compareLabel,
      periodLabel: PERIOD_LABELS[period],
    };
  }, [compare, period, state]);

  const rangeLabel = `${formatDate(ctx.range.from)} a ${formatDate(
    addDays(ctx.range.to, -1)
  )}`;

  const handleSave = () => {
    const id = filterId(report, period, compare);
    if (saved.some((filter) => filter.id === id)) {
      toast.info("Esta combinação já está nos filtros salvos.");
      return;
    }
    persist([{ id, report, period, compare }, ...saved].slice(0, MAX_SAVED));
    toast.success("Filtros salvos", {
      description: `${definition.label} · ${PERIOD_LABELS[period]}${
        compare ? " · com comparação" : ""
      }`,
    });
  };

  const handleApplySaved = (filter: SavedFilter) => {
    setPeriod(filter.period);
    setCompare(filter.compare);
    changeReport(filter.report);
    toast.success(
      `${reportByKey(filter.report).label} · ${PERIOD_LABELS[filter.period]}`
    );
  };

  const handleRemoveSaved = (id: string) => {
    persist(saved.filter((filter) => filter.id !== id));
    toast.success("Filtro removido.");
  };

  const handleExport = (kind: ExportKind) => {
    toast.info(
      kind === "pdf"
        ? "Exportação em PDF é uma demonstração"
        : "Exportação em Excel é uma demonstração",
      {
        description: `Na versão final o relatório "${definition.label}" (${PERIOD_LABELS[period]}) sai pronto para envio à contabilidade.`,
      }
    );
  };

  const handlePrint = () => {
    toast.success("Abrindo a janela de impressão…");
    window.print();
  };

  const ReportComponent = definition.Component;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`${definition.description} · ${PERIOD_LABELS[period]} (${rangeLabel})`}
      />

      <ReportToolbar
        report={report}
        period={period}
        compare={compare}
        saved={saved}
        onReportChange={changeReport}
        onPeriodChange={changePeriod}
        onCompareChange={changeCompare}
        onSave={handleSave}
        onApplySaved={handleApplySaved}
        onRemoveSaved={handleRemoveSaved}
        onExport={handleExport}
        onPrint={handlePrint}
      />

      {loading ? (
        <RelatoriosSkeleton />
      ) : (
        <div key={`${report}-${period}`}>
          <ReportComponent ctx={ctx} />
        </div>
      )}
    </div>
  );
}

function RelatoriosSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Carregando relatório"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-27" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-16" />
      <Skeleton className="h-64" />
    </div>
  );
}
