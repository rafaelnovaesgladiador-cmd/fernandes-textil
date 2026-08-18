"use client";

import { Badge } from "@/components/ui/badge";
import { SALE_STATUS_LABELS, type SaleStatus } from "@/lib/types";

/** Cores por situação da venda — o mesmo código em toda a área de vendas. */
const STATUS_VARIANT: Record<
  SaleStatus,
  "success" | "warning" | "serious" | "critical" | "secondary"
> = {
  em_andamento: "warning",
  finalizada: "success",
  cancelada: "critical",
  trocada: "secondary",
  devolvida: "serious",
  parcialmente_devolvida: "serious",
};

export function SaleStatusBadge({
  status,
  className,
}: {
  status: SaleStatus;
  className?: string;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {SALE_STATUS_LABELS[status]}
    </Badge>
  );
}
