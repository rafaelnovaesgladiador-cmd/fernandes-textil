"use client";

import {
  Copy,
  EllipsisVertical,
  Eye,
  Package,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Product } from "@/lib/types";

export function ProductActionsMenu({
  product,
  onView,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onAdjustStock,
}: {
  product: Product;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
  onAdjustStock: () => void;
}) {
  const isActive = product.status === "ativo";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Ações de ${product.name}`}
        >
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onSelect={onView}>
          <Eye /> Ver detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onAdjustStock}>
          <Package /> Ajustar estoque
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDuplicate}>
          <Copy /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onToggleStatus}
          variant={isActive ? "destructive" : "default"}
        >
          {isActive ? <PowerOff /> : <Power />}
          {isActive ? "Inativar" : "Ativar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
