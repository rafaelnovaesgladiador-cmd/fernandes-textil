"use client";

import {
  BookmarkPlus,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Printer,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  REPORTS,
  reportByKey,
  type ReportKey,
} from "@/components/relatorios/report-registry";
import { PERIOD_LABELS, type PeriodKey } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export interface SavedFilter {
  id: string;
  report: ReportKey;
  period: PeriodKey;
  compare: boolean;
}

export type ExportKind = "pdf" | "excel";

/**
 * Barra de controle dos relatórios: o que ver, de quando e com qual comparação.
 * No celular os seletores vão para uma gaveta para não espremer a tela.
 */
export function ReportToolbar({
  report,
  period,
  compare,
  saved,
  onReportChange,
  onPeriodChange,
  onCompareChange,
  onSave,
  onApplySaved,
  onRemoveSaved,
  onExport,
  onPrint,
}: {
  report: ReportKey;
  period: PeriodKey;
  compare: boolean;
  saved: SavedFilter[];
  onReportChange: (key: ReportKey) => void;
  onPeriodChange: (key: PeriodKey) => void;
  onCompareChange: (value: boolean) => void;
  onSave: () => void;
  onApplySaved: (filter: SavedFilter) => void;
  onRemoveSaved: (id: string) => void;
  onExport: (kind: ExportKind) => void;
  onPrint: () => void;
}) {
  const selectors = (
    <>
      <Select
        value={report}
        onValueChange={(value) => onReportChange(value as ReportKey)}
      >
        <SelectTrigger
          className="w-full sm:w-56"
          aria-label="Escolher relatório"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REPORTS.map((item) => (
            <SelectItem key={item.key} value={item.key}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={period}
        onValueChange={(value) => onPeriodChange(value as PeriodKey)}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Escolher período">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
            <SelectItem key={key} value={key}>
              {PERIOD_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={compare ? "default" : "outline"}
        aria-pressed={compare}
        aria-label="Comparar com o período anterior"
        className="w-full sm:w-auto"
        onClick={() => onCompareChange(!compare)}
      >
        <GitCompareArrows />
        {compare ? "Comparando" : "Comparar"}
      </Button>
    </>
  );

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {selectors}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="sm:hidden" aria-label="Relatório e período">
              <SlidersHorizontal />
              {reportByKey(report).label} · {PERIOD_LABELS[period]}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="pb-[max(env(safe-area-inset-bottom),1.25rem)]"
          >
            <SheetHeader>
              <SheetTitle>Relatório e período</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-4">
              <div className="space-y-1.5">
                <Label>Relatório, período e comparação</Label>
                <div className="flex flex-col gap-2 [&>button]:w-full">
                  {selectors}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label="Exportar relatório em PDF"
            onClick={() => onExport("pdf")}
          >
            <FileText />
            <span className="hidden sm:inline">Exportar PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Exportar relatório em Excel"
            onClick={() => onExport("excel")}
          >
            <FileSpreadsheet />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Imprimir relatório"
            onClick={onPrint}
          >
            <Printer />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Salvar combinação de filtros"
            onClick={onSave}
          >
            <BookmarkPlus />
            <span className="hidden sm:inline">Salvar filtros</span>
          </Button>
        </div>
      </div>

      {saved.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtros salvos:</span>
          {saved.map((filter) => {
            const active =
              filter.report === report &&
              filter.period === period &&
              filter.compare === compare;
            return (
              <span
                key={filter.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border py-0.5 pl-3 pr-1 text-xs transition-colors",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "bg-card hover:bg-secondary"
                )}
              >
                <button
                  type="button"
                  className="cursor-pointer py-0.5 font-medium outline-none focus-visible:underline"
                  onClick={() => onApplySaved(filter)}
                >
                  {reportByKey(filter.report).label} ·{" "}
                  {PERIOD_LABELS[filter.period]}
                  {filter.compare ? " · comparado" : ""}
                </button>
                <button
                  type="button"
                  aria-label={`Remover filtro salvo ${reportByKey(filter.report).label}`}
                  className="cursor-pointer rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
                  onClick={() => onRemoveSaved(filter.id)}
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
