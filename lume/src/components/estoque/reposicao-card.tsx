"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Copy, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEMO_TODAY } from "@/lib/dates";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";
import type { ProductStockAnalysis } from "@/lib/metrics";
import type { AppState } from "@/lib/store/state";
import { cn } from "@/lib/utils";
import { RESTOCK_TARGET_DAYS, suggestedRestock } from "./stock-meta";

interface RestockRow {
  analysis: ProductStockAnalysis;
  coverage: number;
  suggested: number;
  cost: number;
  supplierName: string;
  urgency: "critica" | "atencao";
}

/** Giro e cobertura: o que acaba primeiro e quanto pedir para cada produto. */
export function ReposicaoCard({
  state,
  analysis,
  className,
}: {
  state: AppState;
  analysis: ProductStockAnalysis[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const rows = useMemo<RestockRow[]>(() => {
    const supplierById = new Map(state.suppliers.map((s) => [s.id, s.name]));
    return analysis
      .filter((item) => item.needsRestock)
      .map((item) => {
        const coverage = item.coverageDays ?? 0;
        const suggested = suggestedRestock(item.monthlyAverage, item.stock);
        return {
          analysis: item,
          coverage,
          suggested,
          cost: suggested * item.product.cost,
          supplierName:
            supplierById.get(item.product.supplierId) ?? "Fornecedor não informado",
          urgency: coverage <= 7 ? ("critica" as const) : ("atencao" as const),
        };
      })
      .sort((a, b) => a.coverage - b.coverage || b.analysis.revenue90 - a.analysis.revenue90);
  }, [state, analysis]);

  const totalPieces = rows.reduce((sum, row) => sum + row.suggested, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const critical = rows.filter((row) => row.urgency === "critica").length;
  const revenueAtRisk = rows.reduce((sum, row) => sum + row.analysis.revenue90, 0);

  const listText = useMemo(() => {
    const bySupplier = new Map<string, RestockRow[]>();
    for (const row of rows) {
      const list = bySupplier.get(row.supplierName) ?? [];
      list.push(row);
      bySupplier.set(row.supplierName, list);
    }
    const blocks = [...bySupplier.entries()].map(([supplier, list]) => {
      const lines = list.map(
        (row) =>
          `- ${row.analysis.product.name} (${row.analysis.product.category}) — repor ${formatNumber(
            row.suggested
          )} un · estoque atual ${formatNumber(row.analysis.stock)} · cobertura ${formatNumber(
            row.coverage
          )} dias · vende ${formatNumber(
            Math.round(row.analysis.monthlyAverage)
          )} un/mês`
      );
      const subtotal = list.reduce((sum, row) => sum + row.cost, 0);
      return `${supplier}\n${lines.join("\n")}\nSubtotal: ${formatBRL(subtotal)}`;
    });

    return [
      `Lista de reposição — ${state.company.tradeName}`,
      `Gerada em ${formatDate(DEMO_TODAY)} · cobertura alvo de ${RESTOCK_TARGET_DAYS} dias`,
      "",
      ...blocks.flatMap((block) => [block, ""]),
      `Total: ${formatNumber(totalPieces)} peças · ${formatBRL(totalCost)} em custo estimado`,
    ].join("\n");
  }, [rows, state.company.tradeName, totalPieces, totalCost]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(listText);
      toast.success("Lista copiada", {
        description: "Cole no WhatsApp do fornecedor ou no e-mail do pedido.",
      });
    } catch {
      toast.error("Não foi possível copiar automaticamente", {
        description: "Selecione o texto da lista e copie manualmente.",
      });
    }
  };

  const columns: Column<RestockRow>[] = [
    {
      id: "produto",
      header: "Produto",
      primary: true,
      cell: (row) => (
        <span className="font-medium">{row.analysis.product.name}</span>
      ),
    },
    {
      id: "fornecedor",
      header: "Fornecedor",
      secondary: true,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.analysis.product.category} · {row.supplierName}
        </span>
      ),
    },
    {
      id: "ritmo",
      header: "Ritmo de venda",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums">
          {formatNumber(Math.round(row.analysis.monthlyAverage))} un/mês
        </span>
      ),
    },
    {
      id: "estoque",
      header: "Estoque",
      align: "right",
      cell: (row) => (
        <span className="tabular-nums">{formatNumber(row.analysis.stock)}</span>
      ),
    },
    {
      id: "cobertura",
      header: "Cobertura",
      align: "right",
      cell: (row) => (
        <Badge variant={row.urgency === "critica" ? "critical" : "warning"}>
          {formatNumber(row.coverage)} dias
        </Badge>
      ),
    },
    {
      id: "sugestao",
      header: "Repor",
      align: "right",
      cell: (row) => (
        <span className="font-medium tabular-nums">
          {formatNumber(row.suggested)} un
        </span>
      ),
    },
    {
      id: "custo",
      header: "Custo estimado",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {formatBRL(row.cost)}
        </span>
      ),
    },
  ];

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Giro e cobertura — o que precisa de reposição</CardTitle>
            <CardDescription>
              Produtos cujo estoque acaba em menos de 15 dias no ritmo de venda
              dos últimos 90 dias.
            </CardDescription>
          </div>
          {rows.length > 0 ? (
            <Button onClick={() => setOpen(true)}>
              <ClipboardList />
              Gerar lista de reposição
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Nenhum produto em risco de faltar"
            description="No ritmo atual de vendas, todos os produtos têm mais de 15 dias de cobertura."
          />
        ) : (
          <>
            <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
              <strong className="text-foreground">
                {formatNumber(rows.length)}{" "}
                {rows.length === 1 ? "produto precisa" : "produtos precisam"} de
                reposição
              </strong>
              {critical > 0
                ? ` — ${formatNumber(critical)} ${
                    critical === 1 ? "deles some" : "deles somem"
                  } da arara em até 7 dias.`
                : "."}{" "}
              Juntos, geraram {formatBRL(revenueAtRisk)} nos últimos 90 dias: é
              esse faturamento que para quando a peça acaba. Repor{" "}
              {formatNumber(totalPieces)} peças custa cerca de{" "}
              {formatBRL(totalCost)}.
            </p>

            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(row) => row.analysis.product.id}
            />
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lista de reposição</DialogTitle>
            <DialogDescription>
              {formatNumber(rows.length)} produtos ·{" "}
              {formatNumber(totalPieces)} peças ·{" "}
              {formatBRL(totalCost)} em custo estimado · cobertura alvo de{" "}
              {RESTOCK_TARGET_DAYS} dias
            </DialogDescription>
          </DialogHeader>

          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-secondary/40 p-3 font-mono text-xs leading-relaxed">
            {listText}
          </pre>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleCopy}>
              <Copy />
              Copiar lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
