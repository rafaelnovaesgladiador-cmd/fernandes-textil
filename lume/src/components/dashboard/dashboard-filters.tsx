"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { PERIOD_LABELS, type DashboardFilters, type PeriodKey } from "@/lib/metrics";
import { demoSellers, demoUnits } from "@/lib/mock";
import { CHANNEL_LABELS, type SalesChannel } from "@/lib/types";

/**
 * Filtros do Dashboard: período sempre visível; canal, vendedora e unidade
 * ficam em linha no desktop e em gaveta no celular.
 */
export function DashboardFiltersBar({
  filters,
  onChange,
}: {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}) {
  const selects = (
    <>
      <Select
        value={filters.channel}
        onValueChange={(value) =>
          onChange({ ...filters, channel: value as DashboardFilters["channel"] })
        }
      >
        <SelectTrigger size="sm" className="w-full sm:w-auto" aria-label="Filtrar por canal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os canais</SelectItem>
          {(Object.keys(CHANNEL_LABELS) as SalesChannel[]).map((channel) => (
            <SelectItem key={channel} value={channel}>
              {CHANNEL_LABELS[channel]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sellerId}
        onValueChange={(value) => onChange({ ...filters, sellerId: value })}
      >
        <SelectTrigger size="sm" className="w-full sm:w-auto" aria-label="Filtrar por vendedora">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as vendedoras</SelectItem>
          {demoSellers.map((seller) => (
            <SelectItem key={seller.id} value={seller.id}>
              {seller.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={demoUnits[0].id} disabled>
        <SelectTrigger size="sm" className="w-full sm:w-auto" aria-label="Unidade da loja">
          <SelectValue placeholder={demoUnits[0].name} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={demoUnits[0].id}>{demoUnits[0].name}</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.period}
        onValueChange={(value) =>
          onChange({ ...filters, period: value as PeriodKey })
        }
      >
        <SelectTrigger size="sm" aria-label="Período">
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

      <div className="hidden items-center gap-2 sm:flex">{selects}</div>

      {/* Filtros extras em gaveta no celular */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="sm:hidden" aria-label="Mais filtros">
            <SlidersHorizontal />
            Filtros
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <SheetHeader>
            <SheetTitle>Filtrar Dashboard</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4">
            <div className="space-y-1.5">
              <Label>Canal de venda</Label>
              <div className="[&>button]:w-full">{selects}</div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
