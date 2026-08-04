"use client";

import { SlidersHorizontal } from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/sheet";
import { PERIOD_LABELS, type PeriodKey } from "@/lib/metrics";
import {
  CHANNEL_LABELS,
  PAYMENT_LABELS,
  SALE_STATUS_LABELS,
  type PaymentMethod,
  type SaleStatus,
  type SalesChannel,
  type Seller,
} from "@/lib/types";
import { useState } from "react";

export interface SalesHistoryFilters {
  period: PeriodKey;
  status: SaleStatus | "todos";
  sellerId: string | "todos";
  channel: SalesChannel | "todos";
  paymentMethod: PaymentMethod | "todos";
  query: string;
}

export const DEFAULT_SALES_FILTERS: SalesHistoryFilters = {
  period: "30d",
  status: "todos",
  sellerId: "todos",
  channel: "todos",
  paymentMethod: "todos",
  query: "",
};

export function countActiveFilters(filters: SalesHistoryFilters): number {
  return [
    filters.status !== "todos",
    filters.sellerId !== "todos",
    filters.channel !== "todos",
    filters.paymentMethod !== "todos",
    filters.query.trim().length > 0,
  ].filter(Boolean).length;
}

/**
 * Filtros do histórico: período e busca sempre à mão; os demais ficam em
 * linha no desktop e em gaveta no celular.
 */
export function SalesFiltersBar({
  filters,
  onChange,
  sellers,
}: {
  filters: SalesHistoryFilters;
  onChange: (filters: SalesHistoryFilters) => void;
  sellers: Seller[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = countActiveFilters(filters);

  const selects = [
    {
      id: "filtro-status",
      label: "Situação",
      value: filters.status,
      onValueChange: (value: string) =>
        onChange({ ...filters, status: value as SalesHistoryFilters["status"] }),
      options: [
        { value: "todos", label: "Todas as situações" },
        ...(Object.keys(SALE_STATUS_LABELS) as SaleStatus[]).map((status) => ({
          value: status,
          label: SALE_STATUS_LABELS[status],
        })),
      ],
    },
    {
      id: "filtro-vendedora",
      label: "Vendedora",
      value: filters.sellerId,
      onValueChange: (value: string) => onChange({ ...filters, sellerId: value }),
      options: [
        { value: "todos", label: "Todas as vendedoras" },
        ...sellers.map((seller) => ({ value: seller.id, label: seller.name })),
      ],
    },
    {
      id: "filtro-canal",
      label: "Canal",
      value: filters.channel,
      onValueChange: (value: string) =>
        onChange({
          ...filters,
          channel: value as SalesHistoryFilters["channel"],
        }),
      options: [
        { value: "todos", label: "Todos os canais" },
        ...(Object.keys(CHANNEL_LABELS) as SalesChannel[]).map((channel) => ({
          value: channel,
          label: CHANNEL_LABELS[channel],
        })),
      ],
    },
    {
      id: "filtro-pagamento",
      label: "Forma de pagamento",
      value: filters.paymentMethod,
      onValueChange: (value: string) =>
        onChange({
          ...filters,
          paymentMethod: value as SalesHistoryFilters["paymentMethod"],
        }),
      options: [
        { value: "todos", label: "Todos os pagamentos" },
        ...(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => ({
          value: method,
          label: PAYMENT_LABELS[method],
        })),
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchInput
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Buscar por código da venda ou cliente…"
        aria-label="Buscar venda por código ou nome da cliente"
        className="sm:w-72"
      />

      <div className="flex items-center gap-2">
        <Select
          value={filters.period}
          onValueChange={(value) =>
            onChange({ ...filters, period: value as PeriodKey })
          }
        >
          <SelectTrigger className="h-9 flex-1 sm:flex-none" aria-label="Período">
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
          variant="outline"
          className="h-9 shrink-0 lg:hidden"
          aria-label="Mais filtros"
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontal />
          Filtros
          {active > 0 ? (
            <Badge variant="default" className="ml-0.5">
              {active}
            </Badge>
          ) : null}
        </Button>
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        {selects.map((select) => (
          <Select
            key={select.id}
            value={select.value}
            onValueChange={select.onValueChange}
          >
            <SelectTrigger className="h-9" aria-label={select.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {select.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.25rem)]"
        >
          <SheetHeader>
            <SheetTitle>Filtrar vendas</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4">
            {selects.map((select) => (
              <div key={select.id} className="space-y-1.5">
                <Label htmlFor={select.id}>{select.label}</Label>
                <Select value={select.value} onValueChange={select.onValueChange}>
                  <SelectTrigger id={select.id} className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {select.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button className="h-11 w-full" onClick={() => setSheetOpen(false)}>
              Ver resultados
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
