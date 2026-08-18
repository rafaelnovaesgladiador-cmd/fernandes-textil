"use client";

import { Badge } from "@/components/ui/badge";
import { PURCHASE_STATUS_LABELS, type PurchaseStatus } from "@/lib/types";

const VARIANT: Record<
  PurchaseStatus,
  "secondary" | "warning" | "success" | "critical"
> = {
  rascunho: "secondary",
  pedido: "warning",
  recebido: "success",
  cancelado: "critical",
};

/** Situação do pedido de compra em cor consistente com o restante do sistema. */
export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <Badge variant={VARIANT[status]}>{PURCHASE_STATUS_LABELS[status]}</Badge>;
}
