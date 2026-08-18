"use client";

import { History } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import type { CashSession } from "@/lib/types";
import { DIFFERENCE_LABELS, differenceTone } from "./cash-helpers";

/** Fechamentos anteriores: onde a diferença de caixa vira histórico auditável. */
export function SessionHistory({ sessions }: { sessions: CashSession[] }) {
  const closed = [...sessions]
    .filter((session) => session.closedAt)
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  const columns: Column<CashSession>[] = [
    {
      id: "date",
      header: "Data",
      primary: true,
      cell: (row) => (
        <span className="tabular-nums">{formatDate(row.openedAt)}</span>
      ),
    },
    {
      id: "user",
      header: "Responsável",
      secondary: true,
      cell: (row) => row.userName,
    },
    {
      id: "closedAt",
      header: "Fechado em",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums">
          {row.closedAt ? formatDateTime(row.closedAt) : "—"}
        </span>
      ),
    },
    {
      id: "opening",
      header: "Abertura",
      align: "right",
      cell: (row) => formatBRL(row.openingAmount),
    },
    {
      id: "expected",
      header: "Esperado",
      align: "right",
      cell: (row) =>
        formatBRL((row.countedAmount ?? 0) - (row.difference ?? 0)),
    },
    {
      id: "counted",
      header: "Contado",
      align: "right",
      cell: (row) => formatBRL(row.countedAmount ?? 0),
    },
    {
      id: "difference",
      header: "Diferença",
      align: "right",
      cell: (row) => {
        const difference = row.difference ?? 0;
        const tone = differenceTone(difference);
        return (
          <Badge
            variant={
              tone === "ok" ? "success" : tone === "sobra" ? "warning" : "critical"
            }
            title={DIFFERENCE_LABELS[tone]}
          >
            {difference > 0 ? "+" : ""}
            {formatBRL(difference)}
          </Badge>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de fechamentos</CardTitle>
        <CardDescription>
          Sessões já encerradas, com a diferença apurada em cada conferência.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          rows={closed}
          columns={columns}
          getRowId={(row) => row.id}
          emptyState={
            <EmptyState
              icon={History}
              title="Nenhum caixa fechado ainda"
              description="Assim que você fechar o primeiro caixa, o resultado da conferência aparece aqui."
            />
          }
        />
      </CardContent>
    </Card>
  );
}
